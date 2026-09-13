import fs from 'fs/promises';
import path from 'path';
import { GAMERULES } from '@/types/gamerules';

const CONFIG_PATH = path.resolve(process.cwd(), '../data/gamerules.json');

/**
 * Initializes default gamerules if the JSON file does not exist yet.
 */
async function ensureDefaultConfigExists(): Promise<Record<string, boolean | number>> {
  const initialDefaults: Record<string, boolean | number> = {};

  // Build full default mapping from definition list
  for (const rule of GAMERULES) {
    const cleanName = rule.name.replace('minecraft:', '');
    initialDefaults[cleanName] = rule.defaultValue;
  }

  try {
    // Check if file already exists
    await fs.access(CONFIG_PATH);
  } catch {
    // File doesn't exist -> Create directory and save full initial state
    const dir = path.dirname(CONFIG_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      CONFIG_PATH,
      JSON.stringify(initialDefaults, null, 2),
      'utf-8'
    );
  }

  return initialDefaults;
}

/**
 * Reads saved gamerules from local JSON storage (auto-populates if missing)
 */
export async function readGameruleConfig(): Promise<Record<string, boolean | number>> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
    const existing = JSON.parse(raw);

    // Merge missing rules in case new gamerules were added to types/gamerules.ts
    let needsUpdate = false;
    for (const rule of GAMERULES) {
      const cleanName = rule.name.replace('minecraft:', '');
      if (!(cleanName in existing)) {
        existing[cleanName] = rule.defaultValue;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await fs.writeFile(CONFIG_PATH, JSON.stringify(existing, null, 2), 'utf-8');
    }

    return existing;
  } catch {
    // Initialize file on first run
    return await ensureDefaultConfigExists();
  }
}

/**
 * Saves or updates a single rule in local JSON storage
 */
export async function saveGameruleConfig(
  ruleName: string,
  value: boolean | number
): Promise<void> {
  const cleanName = ruleName.replace('minecraft:', '');
  const currentConfig = await readGameruleConfig();

  currentConfig[cleanName] = value;

  const dir = path.dirname(CONFIG_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    CONFIG_PATH,
    JSON.stringify(currentConfig, null, 2),
    'utf-8'
  );
}

/**
 * Flushes ALL saved local rules to Minecraft live via RCON upon boot
 */
export async function syncGamerulesOnStartup(
  initialDelayMs = 0
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  if (initialDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, initialDelayMs));
  }

  const { waitForRcon, sendRconBatch } = await import('@/lib/rcon');
  const isAvailable = await waitForRcon(60, 2500);

  if (!isAvailable) {
    return {
      success: false,
      syncedCount: 0,
      error: 'RCON connection timed out during server boot.',
    };
  }

  try {
    // Read complete rule set (auto-initialized if empty)
    const savedConfig = await readGameruleConfig();
    const entries = Object.entries(savedConfig);

    if (entries.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    // Build batch list for ALL rules in local storage
    const commands = entries.map(([rule, val]) => `gamerule ${rule} ${val}`);
    await sendRconBatch(commands);

    return { success: true, syncedCount: entries.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown sync error';
    return { success: false, syncedCount: 0, error: msg };
  }
}