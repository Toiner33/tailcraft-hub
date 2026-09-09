import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import * as tar from 'tar';

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

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function GET() {
  try {
    await ensureDirectoryExists(BACKUPS_DIR);
    const files = await fs.readdir(BACKUPS_DIR);

    const backups = await Promise.all(
      files
        .filter((file) => file.endsWith('.tar.gz'))
        .map(async (filename) => {
          const filePath = path.join(BACKUPS_DIR, filename);
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


export async function POST() {
  try {
    await ensureDirectoryExists(BACKUPS_DIR);

    // Verify world folder exists
    try {
      await fs.access(WORLD_PATH);
    } catch {
      return NextResponse.json(
        { success: false, error: 'World directory (data/world) does not exist.' },
        { status: 404 }
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `world-backup-${timestamp}.tar.gz`;
    const destinationPath = path.join(BACKUPS_DIR, backupFilename);

    // Create tar.gz stream from world directory
    await tar.c(
      {
        gzip: true,
        file: destinationPath,
        cwd: path.dirname(WORLD_PATH),
      },
      ['world']
    );

    const stats = await fs.stat(destinationPath);

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully.',
      backup: {
        filename: backupFilename,
        sizeBytes: stats.size,
        formattedSize: formatBytes(stats.size),
        createdAt: stats.birthtime.toISOString(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create backup';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Filename parameter is required.' }, { status: 400 });
    }

    // Security check to prevent path traversal
    const safeFilename = path.basename(filename);
    const targetPath = path.join(BACKUPS_DIR, safeFilename);

    await fs.unlink(targetPath);

    return NextResponse.json({ success: true, message: `Backup ${safeFilename} deleted successfully.` });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete backup';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
