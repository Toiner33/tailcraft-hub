import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { sendRconCommand } from '@/lib/rcon';
import { getServerById } from '@/lib/serverRegistry';
import { APP_CONFIG } from '@/lib/config';
import { getWorldDirName } from '@/lib/serverProperties';
import { decodeDimensionId } from '@/lib/dimensions';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PRUNE_ALL_THRESHOLD = 0;
const CHUNKS_EXTENSION = '.mca';
const MCA_FILENAME_REGEX = /^r\.-?\d+\.-?\d+\.mca$/;

function isRegionFile(filename: string): boolean {
  return filename.endsWith(CHUNKS_EXTENSION) && MCA_FILENAME_REGEX.test(filename);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;

    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { dimensionId, daysOlderThan } = body;

    if (!dimensionId || typeof dimensionId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing dimensionId' },
        { status: 400 }
      );
    }

    // Flush live server data via RCON
    try {
      await sendRconCommand(server.rcon, 'save-all flush');
    } catch {
      // Server may be offline; safe to proceed
    }

    const serverDir = path.join(APP_CONFIG.serversRootDir, server.id);
    const worldDirName = await getWorldDirName(server.id);
    const mainWorldDir = path.join(serverDir, worldDirName);

    // Decode dimensionId slug back into absolute dimension root path
    const dimRoot = decodeDimensionId(serverDir, dimensionId, mainWorldDir);

    try {
      const stat = await fs.stat(dimRoot);
      if (!stat.isDirectory()) {
        return NextResponse.json({ success: false, error: 'Dimension path is not a directory' }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Dimension folder does not exist' }, { status: 404 });
    }

    const now = Date.now();
    const thresholdMs = (daysOlderThan ?? PRUNE_ALL_THRESHOLD) * MS_PER_DAY;
    const isFullReset = daysOlderThan === PRUNE_ALL_THRESHOLD;

    let prunedCount = 0;
    let freedBytes = 0;

    // Dynamically read ALL subdirectories inside dimRoot and prune matching .mca files
    try {
      const subEntries = await fs.readdir(dimRoot, { withFileTypes: true });

      for (const subEntry of subEntries) {
        if (!subEntry.isDirectory()) continue;

        const subDirPath = path.join(dimRoot, subEntry.name);
        const files = await fs.readdir(subDirPath);
        const mcaFiles = files.filter(isRegionFile);

        for (const file of mcaFiles) {
          const filePath = path.join(subDirPath, file);
          const stat = await fs.stat(filePath);

          const ageMs = now - stat.mtimeMs;
          if (isFullReset || ageMs >= thresholdMs) {
            freedBytes += stat.size;
            await fs.unlink(filePath);

            if (subEntry.name.toLowerCase() === 'region') {
              prunedCount++;
            }
          }
        }
      }
    } catch {
      // Error reading subdirectories
    }

    const actionDescription = isFullReset ? 'Fully reset' : `Pruned older than ${daysOlderThan} days in`;

    return NextResponse.json({
      success: true,
      prunedCount,
      freedBytes,
      message: `${actionDescription} dimension ${dimensionId} successfully.`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Prune operation failed';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}