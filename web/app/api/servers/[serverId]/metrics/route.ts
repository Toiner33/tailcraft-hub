import { NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import si from 'systeminformation';
import { getContainerByServerId } from '@/lib/docker';
import { getServerById } from '@/lib/serverRegistry';
import { APP_CONFIG } from '@/lib/config';

// --- Data Unit Conversion Factors ---
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * 1024;
const BYTES_PER_GB = BYTES_PER_MB * 1024;

const PERCENT_DECIMALS = 1;
const NO_DECIMALS = 0;

// --- Helper function to calculate folder size recursively ---
async function getFolderSize(dirPath: string): Promise<number> {
  let totalSizeBytes = 0;
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSizeBytes += await getFolderSize(filePath);
      } else if (file.isFile()) {
        const stats = await fs.stat(filePath);
        totalSizeBytes += stats.size;
      }
    }
  } catch {
    // Return 0 if directory is missing or inaccessible
  }
  return totalSizeBytes;
}

export async function GET(
  request: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const { serverId } = params;

    // Validate that the target server exists.
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    // Get the Docker container associated with the server
    const container = await getContainerByServerId(server.id);

    // Fetch container statistics snapshot
    const stats = await container.stats({ stream: false });

    // --- 1. Container Memory Usage ---
    const containerRamBytes = stats.memory_stats.usage || 0;
    const containerRamLimitBytes = stats.memory_stats.limit || 1;
    const containerRamPercent = ((containerRamBytes / containerRamLimitBytes) * 100).toFixed(PERCENT_DECIMALS);

    // --- 2. Container CPU Usage ---
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemCpuDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numberCpus = stats.cpu_stats.online_cpus || os.cpus().length;

    let containerCpuPercent = '0.0';
    if (systemCpuDelta > 0 && cpuDelta > 0) {
      containerCpuPercent = ((cpuDelta / systemCpuDelta) * numberCpus * 100).toFixed(PERCENT_DECIMALS);
    }

    // --- 3. World Data Directory Size (Fixed to use server.id instead of server.name) ---
    const serverFolder = path.join(APP_CONFIG.serversRootDir, server.id);
    const folderSizeBytes = await getFolderSize(serverFolder);

    // --- 4. Host Machine Metrics (Cross-Platform Memory Inspection) ---
    const memData = await si.mem();
    const hostRamUsedBytes = memData.active;
    const hostRamTotalBytes = memData.total;
    const hostRamPercent = ((hostRamUsedBytes / hostRamTotalBytes) * 100).toFixed(PERCENT_DECIMALS);

    const fsData = await si.fsSize();
    const primaryDisk = fsData[0] || { size: 0, used: 0, available: 0, use: 0 };

    // --- 5. Relative Metric Calculations ---
    const containerVsHostRamPercent = ((containerRamBytes / hostRamTotalBytes) * 100).toFixed(PERCENT_DECIMALS);
    const folderVsDiskPercent = primaryDisk.size > 0 
      ? ((folderSizeBytes / primaryDisk.size) * 100).toFixed(PERCENT_DECIMALS) 
      : '0.0';

    return NextResponse.json({
      success: true,
      metrics: {
        container: {
          cpuPercent: parseFloat(containerCpuPercent),
          ramUsedMB: (containerRamBytes / BYTES_PER_MB).toFixed(NO_DECIMALS),
          ramLimitMB: (containerRamLimitBytes / BYTES_PER_MB).toFixed(NO_DECIMALS),
          ramPercent: parseFloat(containerRamPercent),
          ramVsHostPercent: containerVsHostRamPercent,
        },
        storage: {
          folderSizeMB: (folderSizeBytes / BYTES_PER_MB).toFixed(PERCENT_DECIMALS),
          folderSizeGB: (folderSizeBytes / BYTES_PER_GB).toFixed(PERCENT_DECIMALS),
          folderVsDiskPercent: folderVsDiskPercent,
          diskFreeGB: (primaryDisk.available / BYTES_PER_GB).toFixed(PERCENT_DECIMALS),
          diskTotalGB: (primaryDisk.size / BYTES_PER_GB).toFixed(PERCENT_DECIMALS),
        },
        host: {
          cpuCores: os.cpus().length,
          ramUsedGB: (hostRamUsedBytes / BYTES_PER_GB).toFixed(PERCENT_DECIMALS),
          ramTotalGB: (hostRamTotalBytes / BYTES_PER_GB).toFixed(PERCENT_DECIMALS),
          ramPercent: hostRamPercent,
        },
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}