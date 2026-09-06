import { NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import si from 'systeminformation';
import docker from '@/lib/docker';

// --- Data Unit Conversion Factors ---
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * 1024;
const BYTES_PER_GB = BYTES_PER_MB * 1024;

const PERCENTAGE_FACTOR = 100;
const ZERO_PERCENT = '0.0';

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
  } catch (err) {
    // Return 0 if directory is missing or inaccessible
  }
  return totalSizeBytes;
}

export async function GET() {
  try {
    const containerName = process.env.DOCKER_CONTAINER_NAME || 'tailcraft-mc-local';
    const container = docker.getContainer(containerName);

    // Fetch container statistics snapshot
    const stats = await container.stats({ stream: false });

    // --- 1. Container Memory Usage ---
    const containerRamBytes = stats.memory_stats.usage || 0;
    const containerRamLimitBytes = stats.memory_stats.limit || 1;
    const containerRamPercent = ((containerRamBytes / containerRamLimitBytes) * PERCENTAGE_FACTOR).toFixed(1);

    // --- 2. Container CPU Usage ---
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemCpuDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numberCpus = stats.cpu_stats.online_cpus || os.cpus().length;

    let containerCpuPercent = ZERO_PERCENT;
    if (systemCpuDelta > 0 && cpuDelta > 0) {
      containerCpuPercent = ((cpuDelta / systemCpuDelta) * numberCpus * PERCENTAGE_FACTOR).toFixed(1);
    }

    // --- 3. World Data Directory Size ---
    const dataFolderPath = path.resolve(process.cwd(), '../data');
    const folderSizeBytes = await getFolderSize(dataFolderPath);

    // --- 4. Host Machine Metrics (Cross-Platform Memory Inspection) ---
    const memData = await si.mem();
    const hostRamUsedBytes = memData.active; // Active app memory (excludes OS file cache)
    const hostRamTotalBytes = memData.total;
    const hostRamPercent = ((hostRamUsedBytes / hostRamTotalBytes) * PERCENTAGE_FACTOR).toFixed(1);

    const fsData = await si.fsSize();
    const primaryDisk = fsData[0] || { size: 0, used: 0, available: 0, use: 0 };

    // --- 5. Relative Metric Calculations ---
    const containerVsHostRamPercent = ((containerRamBytes / hostRamTotalBytes) * PERCENTAGE_FACTOR).toFixed(1);
    const folderVsDiskPercent = primaryDisk.size > 0 
      ? ((folderSizeBytes / primaryDisk.size) * PERCENTAGE_FACTOR).toFixed(2) 
      : '0.00';

    return NextResponse.json({
      success: true,
      metrics: {
        container: {
          cpuPercent: parseFloat(containerCpuPercent),
          ramUsedMB: (containerRamBytes / BYTES_PER_MB).toFixed(0),
          ramLimitMB: (containerRamLimitBytes / BYTES_PER_MB).toFixed(0),
          ramPercent: parseFloat(containerRamPercent),
          ramVsHostPercent: containerVsHostRamPercent,
        },
        storage: {
          folderSizeMB: (folderSizeBytes / BYTES_PER_MB).toFixed(1),
          folderSizeGB: (folderSizeBytes / BYTES_PER_GB).toFixed(2),
          folderVsDiskPercent: folderVsDiskPercent,
          diskFreeGB: (primaryDisk.available / BYTES_PER_GB).toFixed(1),
          diskTotalGB: (primaryDisk.size / BYTES_PER_GB).toFixed(1),
        },
        host: {
          cpuCores: os.cpus().length,
          ramUsedGB: (hostRamUsedBytes / BYTES_PER_GB).toFixed(1),
          ramTotalGB: (hostRamTotalBytes / BYTES_PER_GB).toFixed(1),
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
