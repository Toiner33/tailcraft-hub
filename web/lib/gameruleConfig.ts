import fs from 'fs/promises';
import path from 'path';
import { GAMERULES } from '@/types/gamerules';
import { ServerProfile } from '@/types/server';
import { getServerById } from '@/lib/serverRegistry';
import { APP_CONFIG } from '@/lib/config';

const GAMERULES_FILE_NAME = 'gamerules.json';
const FILE_ENCODING = 'utf-8';

/**
 * Initializes default gamerules if the JSON file does not exist yet.
 */
async function ensureDefaultConfigExists(serverId: string): Promise<Record<string, boolean | number>> {
  const initialDefaults: Record<string, boolean | number> = {};
  
  const server = await getServerById(serverId);
  if (!server) return initialDefaults;

  // Build full default mapping from definition list
  for (const rule of GAMERULES) {
    const cleanName = rule.name.replace('minecraft:', '');
    initialDefaults[cleanName] = rule.defaultValue;
  }

  const gamerulesPath = path.join(APP_CONFIG.serversRootDir, server.id, GAMERULES_FILE_NAME);

  try {
    // Check if file already exists
    await fs.access(gamerulesPath);
  } catch {
    // File doesn't exist -> Create directory and save full initial state
    const dir = path.dirname(gamerulesPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      gamerulesPath,
      JSON.stringify(initialDefaults, null, 2),
      FILE_ENCODING
    );
  }

  return initialDefaults;
}

/**
 * Reads saved gamerules from local JSON storage (auto-populates if missing)
 */
export async function readGameruleConfig(server: ServerProfile): Promise<Record<string, boolean | number>> {
  try {
    if (!server) {
      throw new Error(`Server not found.`);
    }

    const gamerulesPath = path.join(APP_CONFIG.serversRootDir, server.id, GAMERULES_FILE_NAME);

    const raw = await fs.readFile(gamerulesPath, FILE_ENCODING);
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
      await fs.writeFile(gamerulesPath, JSON.stringify(existing, null, 2), FILE_ENCODING);
    }

    return existing;
  } catch {
    // Initialize file on first run or missing file
    return await ensureDefaultConfigExists(server.id);
  }
}

/**
 * Saves or updates a single rule in local JSON storage
 */
export async function saveGameruleConfig(
  server: ServerProfile,
  ruleName: string,
  value: boolean | number
): Promise<void> {
  if (!server) return;

  const gamerulesPath = path.join(APP_CONFIG.serversRootDir, server.id, GAMERULES_FILE_NAME);

  const cleanName = ruleName.replace('minecraft:', '');
  const currentConfig = await readGameruleConfig(server);

  currentConfig[cleanName] = value;

  const dir = path.dirname(gamerulesPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    gamerulesPath,
    JSON.stringify(currentConfig, null, 2),
    FILE_ENCODING
  );
}

/**
 * Flushes ALL saved local rules to Minecraft live via RCON upon boot
 */
export async function syncGamerulesOnStartup(
  server: ServerProfile,
  initialDelayMs = 0
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  if (initialDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, initialDelayMs));
  }

  if (!server) {
    return {
      success: false,
      syncedCount: 0,
      error: `Server not found.`,
    };
  }

  const maxWaitingRetries = 60;
  const maxWaitingTimeMs = 2500;
  const { waitForRcon, sendRconBatch } = await import('@/lib/rcon');
  const isAvailable = await waitForRcon(server.rcon, maxWaitingRetries, maxWaitingTimeMs);

  if (!isAvailable) {
    return {
      success: false,
      syncedCount: 0,
      error: 'RCON connection timed out during server boot.',
    };
  }

  try {
    const savedConfig = await readGameruleConfig(server);
    const entries = Object.entries(savedConfig);

    if (entries.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    const commands = entries.map(([rule, val]) => `gamerule ${rule} ${val}`);
    const batchResult = await sendRconBatch(server.rcon, commands);

    if (!batchResult.success) {
      return {
        success: false,
        syncedCount: 0,
        error: batchResult.error,
      };
    }

    return { success: true, syncedCount: entries.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown sync error';
    return { success: false, syncedCount: 0, error: msg };
  }
}