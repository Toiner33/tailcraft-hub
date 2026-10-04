import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { DIMENSIONS, DimensionStats } from '@/types/dimensions';
import { APP_CONFIG } from '@/lib/config';
import { getServerById } from '@/lib/serverRegistry';
import { formatBytes } from '@/lib/utils';

// Scans binary locations table (first 4096 bytes) of an MCA file to count allocated chunks
async function countGeneratedChunksInMca(filePath: string): Promise<number> {
  try {
    const MCA_HEADER_SIZE_BYTES = 4096;
    const LOCATION_TABLE_ENTRY_SIZE_BYTES = 4;
    
    const handle = await fs.open(filePath, 'r');
    const headerBuffer = Buffer.alloc(MCA_HEADER_SIZE_BYTES);
    await handle.read(headerBuffer, 0, MCA_HEADER_SIZE_BYTES, 0);
    await handle.close();

    let count = 0;
    for (let i = 0; i < MCA_HEADER_SIZE_BYTES; i += LOCATION_TABLE_ENTRY_SIZE_BYTES) {
      const location = headerBuffer.readUInt32BE(i);
      if (location !== 0) count++;
    }
    return count;
  } catch {
    return 0;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;

    // Validate that the target server exists.
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    const dataDir = path.join(APP_CONFIG.serversRootDir, server.id);
    const results: DimensionStats[] = [];
    const CHUNKS_EXTENSION = '.mca';

    for (const dim of DIMENSIONS) {
      const regionDir = path.join(dataDir, dim.subPath);
      let fileCount = 0;
      let totalSizeBytes = 0;
      let chunkCount = 0;
      let latestMtime = 0;

      try {
        const files = await fs.readdir(regionDir);
        const mcaFiles = files.filter((f) => f.endsWith(CHUNKS_EXTENSION));
        fileCount = mcaFiles.length;

        for (const file of mcaFiles) {
          const fullPath = path.join(regionDir, file);
          const stat = await fs.stat(fullPath);
          totalSizeBytes += stat.size;

          if (stat.mtimeMs > latestMtime) {
            latestMtime = stat.mtimeMs;
          }

          const fileChunks = await countGeneratedChunksInMca(fullPath);
          chunkCount += fileChunks;
        }
      } catch {
        // Dimension folder does not exist yet (e.g. End/Nether unvisited)
      }

      results.push({
        id: dim.id,
        name: dim.name,
        folderPath: dim.subPath,
        fileCount,
        totalSizeBytes,
        formattedSize: formatBytes(totalSizeBytes),
        chunkCount,
        lastModified: latestMtime > 0 ? new Date(latestMtime).toISOString() : null,
      });
    }

    return NextResponse.json({ success: true, dimensions: results });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to scan dimensions';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}