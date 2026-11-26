import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getContainerByServerId } from '@/lib/docker';
import { APP_CONFIG } from '@/lib/config';
import { getServerById } from '@/lib/serverRegistry';
import { ServerProfile } from '@/types/server';
import { getWorldDirName } from '@/lib/serverProperties';
import { createServerBackup } from '@/lib/backupManager';
import { BACKUP_PURPOSES } from '@/types/backup';

interface ResetPayload {
  seed: string;
  levelType: string;
  difficulty: string;
  hardcore: boolean;
  generateStructures: boolean;
  /** First-time setup: only save the settings, do not back up or wipe anything. */
  setupOnly?: boolean;
}

/**
 * Ensures the target server container is stopped before permitting a world reset.
 */
async function ensureServerStopped(serverId: string): Promise<void> {
  try {
    const container = await getContainerByServerId(serverId);
    const data = await container.inspect();
    if (data.State.Running) {
      throw new Error('Server must be stopped before resetting the world.');
    }
  } catch (error: any) {
    if (error.message.includes('Server must be stopped')) {
      throw error;
    }
    // Container not found or offline; safe to proceed
  }
}

/**
 * Creates a safety backup of the existing world directory before wiping it.
 * Returns the generated backup filename, or an empty string if skipped.
 */
async function createSafetyBackup(server: ServerProfile, worldDir: string): Promise<string> {
  try {
    await fs.access(worldDir);
    const backupResult = await createServerBackup({ server, purpose: BACKUP_PURPOSES.PRE_RESET });
    return backupResult.success && backupResult.filename ? backupResult.filename : '';
  } catch {
    // World folder did not exist or backup failed
    return '';
  }
}

/**
 * Completely wipes and recreates the world directory with proper permissions.
 */
async function resetWorldDirectory(worldDir: string): Promise<void> {
  try {
    await fs.rm(worldDir, { recursive: true, force: true });
  } catch {
    // Folder was already clean
  }
  await fs.mkdir(worldDir, { recursive: true });

  try {
    const STANDARD_USER_UID = 1000;
    await fs.chown(worldDir, STANDARD_USER_UID, STANDARD_USER_UID);
  } catch {
    // Ignore on non-POSIX or unprivileged hosts
  }
}

/**
 * Updates server.properties with the new world generation parameters.
 * Before the very first start the file does not exist yet, so it is created.
 */
async function updateWorldProperties(server: ServerProfile, payload: ResetPayload): Promise<void> {
  const propertiesPath = path.join(APP_CONFIG.serversRootDir, server.id, APP_CONFIG.serverProperties);
  const FILE_ENCODING = 'utf-8';

  let content = '';
  try {
    content = await fs.readFile(propertiesPath, FILE_ENCODING);
  } catch (err: unknown) {
    // A missing file is expected before the first start; anything else is a real problem.
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    await fs.mkdir(path.dirname(propertiesPath), { recursive: true });
  }

  const LEGACY_GAMERULE_PREFIX = 'minecraft:';
  const cleanLevelType = (payload.levelType || `${LEGACY_GAMERULE_PREFIX}normal`).replace(/\\:/g, ':');

  const updates: Record<string, string> = {
    'level-seed': payload.seed ?? '',
    'level-type': cleanLevelType,
    'difficulty': payload.difficulty ?? 'easy',
    'hardcore': String(payload.hardcore ?? false),
    'generate-structures': String(payload.generateStructures ?? true),
  };

  if (content && !content.endsWith('\n')) content += '\n';

  for (const [key, val] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      // A replacement function avoids special `$` patterns in the value being interpreted
      content = content.replace(regex, () => `${key}=${val}`);
    } else {
      content += `${key}=${val}\n`;
    }
  }

  // Clean up any surviving escaped colons across the entire file
  content = content.replace(/\\:/g, ':');
  await fs.writeFile(propertiesPath, content, FILE_ENCODING);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;

    // Validate server existence
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    const body: ResetPayload = await request.json();

    // 1. Safety Guard: Ensure server container is STOPPED
    try {
      await ensureServerStopped(server.id);
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }

    // First-time setup: there is no world to back up or wipe, only store the settings.
    if (body.setupOnly) {
      await updateWorldProperties(server, body);
      return NextResponse.json({
        success: true,
        message: 'World settings saved. They apply when the server first starts.',
      });
    }

    // Dynamically resolve active world folder name from server.properties
    const worldDirName = await getWorldDirName(server.id);
    const worldDir = path.join(APP_CONFIG.serversRootDir, server.id, worldDirName);

    // 2. Take Pre-Reset Safety Backup & Wipe World Directory
    const safetyBackupName = await createSafetyBackup(server, worldDir);
    await resetWorldDirectory(worldDir);

    // 3. Update server.properties cleanly
    await updateWorldProperties(server, body);

    return NextResponse.json({
      success: true,
      message: safetyBackupName
        ? `World reset complete! Saved pre-reset backup as "${safetyBackupName}".`
        : 'World reset complete!',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to reset world';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}