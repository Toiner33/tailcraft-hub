import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { DIMENSIONS, DimensionStats } from '@/types/dimensions';

const EMPTY_SIZE = 0;

function formatBytes(bytes: number): string {
  const BYTES_PER_KIB = 1024;
  const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === EMPTY_SIZE) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KIB));
  return `${parseFloat((bytes / Math.pow(BYTES_PER_KIB, i)).toFixed(2))} ${SIZE_UNITS[i]}`;
}

// Scans binary locations table (first 4096 bytes) of an MCA file to count allocated chunks
async function countGeneratedChunksInMca(filePath: string): Promise<number> {
  try {
    const MCA_HEADER_SIZE_BYTES = 4096;
    const LOCATION_TABLE_ENTRY_SIZE_BYTES = 4;
    
    const handle = await fs.open(filePath, 'r');
    const headerBuffer = Buffer.alloc(MCA_HEADER_SIZE_BYTES);
    await handle.read(headerBuffer, EMPTY_SIZE, MCA_HEADER_SIZE_BYTES, EMPTY_SIZE);
    await handle.close();

    let count = EMPTY_SIZE;
    for (let i = EMPTY_SIZE; i < MCA_HEADER_SIZE_BYTES; i += LOCATION_TABLE_ENTRY_SIZE_BYTES) {
      const location = headerBuffer.readUInt32BE(i);
      if (location !== EMPTY_SIZE) count++;
    }
    return count;
  } catch {
    return EMPTY_SIZE;
  }
}

export async function GET() {
  try {
    const dataDir = path.resolve(process.cwd(), '../data');
    const results: DimensionStats[] = [];

    for (const dim of DIMENSIONS) {
      const regionDir = path.join(dataDir, dim.subPath);
      let fileCount = EMPTY_SIZE;
      let totalSizeBytes = EMPTY_SIZE;
      let chunkCount = EMPTY_SIZE;
      let latestMtime = EMPTY_SIZE;

      try {
        const files = await fs.readdir(regionDir);
        const mcaFiles = files.filter((f) => f.endsWith('.mca'));
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
        lastModified: latestMtime > EMPTY_SIZE ? new Date(latestMtime).toISOString() : null,
      });
    }

    return NextResponse.json({ success: true, dimensions: results });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to scan dimensions';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}