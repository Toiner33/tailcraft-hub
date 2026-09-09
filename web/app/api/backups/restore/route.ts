import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import * as tar from 'tar';
import docker from '@/lib/docker';

const CONTAINER_NAME = process.env.DOCKER_CONTAINER_NAME || 'tailcraft-mc-local';
const WORLD_PATH = path.resolve(process.cwd(), '../data/world');
const BACKUPS_DIR = path.resolve(process.cwd(), '../data/backups');

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * 1024;
const BYTES_PER_GB = BYTES_PER_MB * 1024;

function formatBytes(bytes: number): string {
  if (bytes >= BYTES_PER_GB) return `${(bytes / BYTES_PER_GB).toFixed(2)} GB`;
  if (bytes >= BYTES_PER_MB) return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;
  if (bytes >= BYTES_PER_KB) return `${(bytes / BYTES_PER_KB).toFixed(2)} KB`;
  return `${bytes} B`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename } = body;

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Filename parameter is required.' }, { status: 400 });
    }

    // 1. Safety Guard: Verify server container is stopped
    try {
      const container = docker.getContainer(CONTAINER_NAME);
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

    // 2. Target Backup Verification
    const safeFilename = path.basename(filename);
    const targetBackupPath = path.join(BACKUPS_DIR, safeFilename);

    try {
      await fs.access(targetBackupPath);
    } catch {
      return NextResponse.json({ success: false, error: 'Target backup file not found.' }, { status: 404 });
    }

    // 3. Step 1: Create Safety Snapshot of Current World State
    let safetyBackupName = '';
    try {
      await fs.access(WORLD_PATH);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      safetyBackupName = `pre-restore-safety-${timestamp}.tar.gz`;
      const safetyBackupPath = path.join(BACKUPS_DIR, safetyBackupName);

      await tar.c(
        {
          gzip: true,
          file: safetyBackupPath,
          cwd: path.dirname(WORLD_PATH),
        },
        ['world']
      );
    } catch {
      // Current live world directory did not exist; skip safety backup creation
    }

    // 4. Wipe current live world
    try {
      await fs.rm(WORLD_PATH, { recursive: true, force: true });
    } catch {
      // Directory was already clean
    }
    await fs.mkdir(WORLD_PATH, { recursive: true });

    // 5. Step 2: Restore the Target Backup
    await tar.x({
      file: targetBackupPath,
      cwd: path.dirname(WORLD_PATH),
    });

    // 6. Step 3: Auto-Delete the Restored Target Backup
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
