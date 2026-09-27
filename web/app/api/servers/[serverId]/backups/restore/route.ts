import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import * as tar from 'tar';
import { getContainerByServerId } from '@/lib/docker';
import { APP_CONFIG } from '@/lib/config';
import { getServerById } from '@/lib/serverRegistry';

const BACKUP_EXTENSION = '.tar.gz';

export async function POST(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const { serverId } = params;

    // Validate that the target server directory exists.
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    // Validate request body
    const body = await request.json();
    const { filename } = body;

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Filename parameter is required.' }, { status: 400 });
    }

    // Validate server container status to ensure it's not running before restoring a backup
    try {
      const container = await getContainerByServerId(server.id);
      const data = await container.inspect();
      if (data.State.Running) {
        return NextResponse.json(
          { success: false, error: 'Server must be stopped before restoring a backup.' },
          { status: 400 }
        );
      }
    } catch {
      // Container not running or not found; safe to proceed
    }

    // Target Backup Verification
    const safeFilename = path.basename(filename);
    const serverBackupsDir = path.join(APP_CONFIG.serversRootDir, serverId, APP_CONFIG.backupsDir); 
    // No need to ensure directory exists, not being able to removes something doesn't exist is OK.
    const targetBackupPath = path.join(serverBackupsDir, safeFilename);
    

    try {
      await fs.access(targetBackupPath);
    } catch {
      return NextResponse.json({ success: false, error: 'Target backup file not found.' }, { status: 404 });
    }

    // Create Safety Snapshot of Current World State to allow rollback in case of issues during restore
    let safetyBackupName = '';
    const serverWorldDir = path.join(APP_CONFIG.serversRootDir, serverId, APP_CONFIG.worldDir);

    try {
      await fs.access(serverWorldDir);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      safetyBackupName = `pre-restore-safety-${timestamp}${BACKUP_EXTENSION}`;
      const safetyBackupPath = path.join(serverBackupsDir, safetyBackupName);

      await tar.c(
        {
          gzip: true,
          file: safetyBackupPath,
          cwd: path.dirname(serverWorldDir),
        },
        [APP_CONFIG.worldDir]
      );
    } catch {
      // Current live world directory did not exist; skip safety backup creation
    }

    // Wipe current live world
    try {
      await fs.rm(serverWorldDir, { recursive: true, force: true });
    } catch {
      // Directory was already clean
    }
    await fs.mkdir(serverWorldDir, { recursive: true });

    // Restore the Target Backup
    await tar.x({
      file: targetBackupPath,
      cwd: path.dirname(serverWorldDir),
    });

    // Ensure UID 1000 ownership after extraction
    const STANDARD_USER_UID = 1000;
    try {
      await fs.chown(serverWorldDir, STANDARD_USER_UID, STANDARD_USER_UID);
    } catch {
      // Ignore on non-POSIX or unprivileged environments
    }

    // Auto-Delete the Restored Target Backup we don't need this since is already restored.
    await fs.unlink(targetBackupPath);

    return NextResponse.json({
      success: true,
      message: safetyBackupName
        ? `Restored successfully! Saved current world as "${safetyBackupName}" and removed restored archive "${safeFilename}".`
        : `Restored successfully! Removed restored archive "${safeFilename}".`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute restore sequence';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}