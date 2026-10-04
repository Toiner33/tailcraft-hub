import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { sendRconCommand } from '@/lib/rcon';
import { getDimensionSubPath, isValidDimensionId } from '@/types/dimensions';
import { getServerById } from '@/lib/serverRegistry';
import { APP_CONFIG } from '@/lib/config';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PRUNE_ALL_THRESHOLD = 0;
const CHUNKS_EXTENSION = '.mca';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;

    // Validate the existence of the target server.
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    // Validate the request body.
    const body = await request.json();
    const { dimensionId, daysOlderThan } = body;

    // Clean, dynamic type guard check from shared definitions
    if (!isValidDimensionId(dimensionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing dimensionId' },
        { status: 400 }
      );
    }

    const targetSubPath = getDimensionSubPath(dimensionId);
    if (!targetSubPath) {
      return NextResponse.json({ success: false, error: 'Invalid dimension specified' }, { status: 400 });
    }

    // Flush live server data via RCON
    try {
      await sendRconCommand(server.rcon, 'save-all flush');
    } catch {
      // Server may be offline; safe to proceed
    }

    const regionDir = path.join(APP_CONFIG.serversRootDir, server.id, targetSubPath);
    let files: string[] = [];
    try {
      files = await fs.readdir(regionDir);
    } catch {
      return NextResponse.json({ success: false, error: 'Dimension folder does not exist' }, { status: 404 });
    }

    const mcaFiles = files.filter((f) => f.endsWith(CHUNKS_EXTENSION));
    const now = Date.now();
    const thresholdMs = (daysOlderThan || PRUNE_ALL_THRESHOLD) * MS_PER_DAY;

    let prunedCount = 0;
    let freedBytes = 0;

    for (const file of mcaFiles) {
      const filePath = path.join(regionDir, file);
      const stat = await fs.stat(filePath);

      const ageMs = now - stat.mtimeMs;
      if (daysOlderThan === PRUNE_ALL_THRESHOLD || ageMs >= thresholdMs) {
        freedBytes += stat.size;
        await fs.unlink(filePath);
        prunedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      prunedCount,
      freedBytes,
      message: `Pruned ${prunedCount} region files from ${dimensionId}.`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Prune operation failed';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}