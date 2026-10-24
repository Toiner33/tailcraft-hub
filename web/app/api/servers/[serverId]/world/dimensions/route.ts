import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { DimensionStats } from '@/types/dimensions';
import { APP_CONFIG } from '@/lib/config';
import { getServerById } from '@/lib/serverRegistry';
import { formatBytes, getFolderSize } from '@/lib/utils';
import { encodeDimensionId } from '@/lib/dimensions';
import { getWorldDirName } from '@/lib/serverProperties';

const CHUNKS_EXTENSION = '.mca';
const MAX_TRAVERSAL_DEPTH = 6;
const MCA_FILENAME_REGEX = /^r\.-?\d+\.-?\d+\.mca$/;

const IGNORED_DIRECTORY_NAMES = new Set([
  'region',
  'entities',
  'poi',
  'backups',
  'backup',
  'plugins',
  'mods',
  'logs',
]);

function shouldIgnoreFolder(folderName: string): boolean {
  const lowerName = folderName.toLowerCase();
  return (
    lowerName.startsWith('.') ||
    lowerName.includes('backup') ||
    lowerName.endsWith('.bak') ||
    lowerName.endsWith('.old') ||
    IGNORED_DIRECTORY_NAMES.has(lowerName)
  );
}

function isRegionFile(filename: string): boolean {
  return filename.endsWith(CHUNKS_EXTENSION) && MCA_FILENAME_REGEX.test(filename);
}

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

async function hasValidRegionFiles(regionDirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(regionDirPath, { withFileTypes: true });
    return entries.some((entry) => entry.isFile() && isRegionFile(entry.name));
  } catch {
    return false;
  }
}

async function discoverDimensionRoots(
  currentDir: string,
  depth: number,
  discoveredRoots: Set<string>
) {
  if (depth > MAX_TRAVERSAL_DEPTH) return;

  try {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    const regionPath = path.join(currentDir, 'region');
    try {
      const regionStat = await fs.stat(regionPath);
      if (regionStat.isDirectory() && (await hasValidRegionFiles(regionPath))) {
        discoveredRoots.add(currentDir);
      }
    } catch {
      // No region folder here
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (shouldIgnoreFolder(entry.name)) continue;

      const childPath = path.join(currentDir, entry.name);
      await discoverDimensionRoots(childPath, depth + 1, discoveredRoots);
    }
  } catch {
    // Ignore restricted folders
  }
}

export async function GET(
  request: Request,
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

    const serverDir = path.join(APP_CONFIG.serversRootDir, server.id);
    const worldDirName = await getWorldDirName(server.id);
    const mainWorldDir = path.join(serverDir, worldDirName);

    const dimensionRootDirs = new Set<string>();

    await discoverDimensionRoots(mainWorldDir, 0, dimensionRootDirs);

    const legacySiblingRoots = [
      path.join(serverDir, `${worldDirName}_nether`),
      path.join(serverDir, `${worldDirName}_the_end`),
    ];

    for (const legacyRoot of legacySiblingRoots) {
      try {
        const stat = await fs.stat(legacyRoot);
        if (stat.isDirectory()) {
          await discoverDimensionRoots(legacyRoot, 0, dimensionRootDirs);
        }
      } catch {
        // Sibling root does not exist
      }
    }

    const results: DimensionStats[] = [];

    for (const dimRoot of dimensionRootDirs) {
      // 1. Get true recursive size of the entire dimension folder
      const totalSizeBytes = await getFolderSize(dimRoot);

      let fileCount = 0;
      let chunkCount = 0;
      let latestMtime = 0;

      // 2. Dynamically inspect ALL subdirectories directly inside dimRoot 
      // (captures region, entities, poi, and any modded companion folders generically)
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

            fileCount++;

            if (stat.mtimeMs > latestMtime) {
              latestMtime = stat.mtimeMs;
            }

            // Count chunks specifically from the 'region' folder to avoid over-counting entity/poi headers
            if (subEntry.name.toLowerCase() === 'region') {
              const fileChunks = await countGeneratedChunksInMca(filePath);
              chunkCount += fileChunks;
            }
          }
        }
      } catch {
        // Skip unreadable folders
      }

      const relativePath = path.relative(serverDir, dimRoot);
      const dimId = encodeDimensionId(serverDir, dimRoot, mainWorldDir);
      const folderDisplayName = path.basename(dimRoot);

      results.push({
        id: dimId,
        name: folderDisplayName === worldDirName ? 'Overworld' : folderDisplayName,
        folderPath: relativePath,
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