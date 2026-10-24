import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { APP_CONFIG } from '@/lib/config';
import { getServerById } from '@/lib/serverRegistry';
import { formatBytes } from '@/lib/utils';
import { createServerBackup } from '@/lib/backupManager';
import { BACKUP_PURPOSES } from '@/types/backup';

const BACKUP_EXTENSION = '.tar.gz';

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
 
    // Validate that the target server directory exists.
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    // Read the backups directory for the specified server
    const serverBackupsDir = path.join(APP_CONFIG.serversRootDir, serverId, APP_CONFIG.backupsDir); 
    await ensureDirectoryExists(serverBackupsDir);
    const files = await fs.readdir(serverBackupsDir);

    const backups = await Promise.all(
      files
        .filter((file) => file.endsWith(BACKUP_EXTENSION))
        .map(async (filename) => {
          const filePath = path.join(serverBackupsDir, filename);
          const stats = await fs.stat(filePath);
          return {
            filename,
            sizeBytes: stats.size,
            formattedSize: formatBytes(stats.size),
            createdAt: stats.birthtime.toISOString(),
          };
        })
    );

    // Sort newest first
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate aggregate backup storage size
    const totalSizeBytes = backups.reduce((sum, item) => sum + item.sizeBytes, 0);

    return NextResponse.json({
      success: true,
      backups,
      totalSizeBytes,
      formattedTotalSize: formatBytes(totalSizeBytes),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to list backups';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
 
    // Validate that the target server directory exists.
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    // Use centralized backup manager with user-trigger purpose (includes disk checks & naming)
    const backupResult = await createServerBackup({ server, purpose: BACKUP_PURPOSES.USER_TRIGGER });
    if (!backupResult.success || !backupResult.filename || backupResult.sizeBytes === undefined) {
      return NextResponse.json(
        { success: false, error: backupResult.error || 'Failed to create backup' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully.',
      backup: {
        filename: backupResult.filename,
        sizeBytes: backupResult.sizeBytes,
        formattedSize: formatBytes(backupResult.sizeBytes),
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create backup';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;

    // Validate that the target server directory exists.
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Filename parameter is required.' }, { status: 400 });
    }

    // Security check to prevent path traversal
    const safeFilename = path.basename(filename);
    const serverBackupsDir = path.join(APP_CONFIG.serversRootDir, serverId, APP_CONFIG.backupsDir); 
    // No need to ensure directory exists, not being able to removes something doesn't exist is OK.
    const targetPath = path.join(serverBackupsDir, safeFilename);

    await fs.unlink(targetPath);

    return NextResponse.json({ success: true, message: `Backup ${safeFilename} deleted successfully.` });
  } catch (error: any) {
    // If the error is due to the file not existing, return a 404 instead of a 500.
    if (error.code === 'ENOENT') {
      return NextResponse.json({ success: false, error: 'Backup file not found.' }, { status: 404 });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete backup';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}