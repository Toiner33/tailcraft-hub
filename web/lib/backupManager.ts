import fs from 'fs/promises';
import path from 'path';
import * as tar from 'tar';
import { APP_CONFIG } from '@/lib/config';
import { getWorldDirName } from '@/lib/serverProperties';
import { CreateBackupOptions, BackupResult } from '@/types/backup';
import { getFolderSize } from '@/lib/utils';
import { getContainerByServerId } from '@/lib/docker';
import { ServerEngine } from '@/types/server';

/**
 * Checks if there is enough available disk space on the host compared to the world size.
 * Uses the current folder size as a worst-case estimation since .tar.gz offers minimal extra compression on Minecraft worlds.
 */
async function hasSufficientDiskSpace(targetDir: string, requiredBytes: number): Promise<boolean> {
  try {
    const stats = await fs.statfs(targetDir);
    const availableBytes = stats.bavail * stats.bsize;
    return availableBytes >= requiredBytes;
  } catch {
    // If statfs is not supported on the host environment, bypass check safely
    return true;
  }
}

/**
 * Helper to extract engine and version with strict ServerEngine typing
 * from the running container's environment variables prior to recreation.
 */
async function getContainerEngineAndVersion(
  serverId: string, 
  fallbackEngine: ServerEngine, 
  fallbackVersion: string
): Promise<{ engine: ServerEngine; version: string }> {
  try {
    const container = await getContainerByServerId(serverId);
    const data = await container.inspect();
    const envs: string[] = data.Config.Env || [];

    let engine: ServerEngine = fallbackEngine;
    let version = fallbackVersion;

    for (const env of envs) {
      if (env.startsWith('TYPE=')) {
        const val = env.split('=')[1];
        if (val) {
          engine = val as ServerEngine;
        }
      } else if (env.startsWith('VERSION=')) {
        version = env.split('=')[1] || fallbackVersion;
      }
    }

    return { engine, version };
  } catch {
    // If container inspect fails, fallback to server profile
    return { engine: fallbackEngine, version: fallbackVersion };
  }
}

/**
 * Centralized utility to create a standardized server world backup.
 */
async function createServerBackup({ server, purpose }: CreateBackupOptions): Promise<BackupResult> {
  try {
    const serverId = server.id;
    const serverBackupsDir = path.join(APP_CONFIG.serversRootDir, serverId, APP_CONFIG.backupsDir);
    await fs.mkdir(serverBackupsDir, { recursive: true });

    // 1. Dynamically resolve active world folder name from server.properties
    const worldDirName = await getWorldDirName(serverId);
    const serverWorldDir = path.join(APP_CONFIG.serversRootDir, serverId, worldDirName);

    // Verify world folder exists
    try {
      await fs.access(serverWorldDir);
    } catch {
      return { success: false, error: `World directory (${worldDirName}) does not exist.` };
    }

    // 2. Calculate exact world folder size as worst-case archive estimation using shared util
    const worldSizeBytes = await getFolderSize(serverWorldDir);

    // 3. Check if available disk space meets or exceeds the required world size
    const hasSpace = await hasSufficientDiskSpace(serverBackupsDir, worldSizeBytes);
    if (!hasSpace) {
      return { 
        success: false, 
        error: `Insufficient disk space on host. Required: ~${Math.round(worldSizeBytes / (1024 * 1024))}MB.` 
      };
    }

    // 4. Resolve engine and version (if pre-recreation, inspect active container to get pre-update metadata)
    let engine: ServerEngine = server.engine;
    let version = server.version;

    if (purpose === 'pre-recreate') {
      const activeMeta = await getContainerEngineAndVersion(serverId, server.engine, server.version);
      engine = activeMeta.engine;
      version = activeMeta.version;
    }

    // 5. Construct standardized filename: [worldName]-[purpose]-backup-[engine]-[version]-[timestamp].tar.gz
    const BACKUP_EXTENSION = '.tar.gz';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${worldDirName}-${purpose}-backup-${engine}-${version}-${timestamp}${BACKUP_EXTENSION}`;
    const destinationPath = path.join(serverBackupsDir, backupFilename);

    // 6. Create tar.gz stream from world directory
    await tar.c(
      {
        gzip: true,
        file: destinationPath,
        cwd: path.dirname(serverWorldDir),
      },
      [worldDirName]
    );

    const stats = await fs.stat(destinationPath);

    return {
      success: true,
      filename: backupFilename,
      destinationPath,
      sizeBytes: stats.size,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown backup error';
    return { success: false, error: errorMessage };
  }
}

export { createServerBackup };