import { NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import si from 'systeminformation';
import { getContainerByServerId } from '@/lib/docker';
import { getServerById } from '@/lib/serverRegistry';
import { APP_CONFIG } from '@/lib/config';
import { getFolderSize } from '@/lib/utils';

// --- Data Unit Conversion Factors ---
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * 1024;
const BYTES_PER_GB = BYTES_PER_MB * 1024;

const PERCENT_DECIMALS = 2;
const NO_DECIMALS = 0;

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

    // Default fallback values for container metrics when stopped/offline
    let containerCpuPercent = 0;
    let containerRamBytes = 0;
    let containerRamLimitBytes = 1;
    let containerRamPercent = '0.0';
    let containerVsHostRamPercent = '0.0';

    try {
      const container = await getContainerByServerId(server.id);
      const containerInfo = await container.inspect();

      if (containerInfo.State.Running) {
        const statsStream = (await container.stats({ stream: false })) as any;
        const stats = typeof statsStream.pipe === 'function' || typeof statsStream.on === 'function'
          ? await new Promise((resolve, reject) => {
              let data = '';
              statsStream.on('data', (chunk: Buffer) => (data += chunk));
              statsStream.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
              });
              statsStream.on('error', reject);
            })
          : statsStream;

        if (stats && stats.memory_stats && stats.cpu_stats) {
          containerRamBytes = stats.memory_stats.usage || 0;
          containerRamLimitBytes = stats.memory_stats.limit || 1;
          containerRamPercent = ((containerRamBytes / containerRamLimitBytes) * 100).toFixed(PERCENT_DECIMALS);

          const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
          const systemCpuDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
          const numberCpus = stats.cpu_stats.online_cpus || os.cpus().length;

          if (systemCpuDelta > 0 && cpuDelta > 0) {
            containerCpuPercent = parseFloat(((cpuDelta / systemCpuDelta) * numberCpus * 100).toFixed(PERCENT_DECIMALS));
          }
        }
      }
    } catch {
      // Container not found or docker daemon issue — safely keep defaults (0)
    }

    // --- World Data Directory Size using shared util ---
    const serverFolder = path.join(APP_CONFIG.serversRootDir, server.id);
    const folderSizeBytes = await getFolderSize(serverFolder);

// --- Host Machine RAM Metrics ---
    const memData = await si.mem();
    const hostRamUsedBytes = memData.active;
    const hostRamTotalBytes = memData.total;
    const hostRamPercent = ((hostRamUsedBytes / hostRamTotalBytes) * 100).toFixed(PERCENT_DECIMALS);

    if (hostRamTotalBytes > 0) {
      containerVsHostRamPercent = ((containerRamBytes / hostRamTotalBytes) * 100).toFixed(PERCENT_DECIMALS);
    }

    // --- Disk Metrics via Native fs.statfs (Container & Host Safe) ---
    let diskSize = 0;
    let diskFree = 0;
    let folderVsDiskPercent = '0.0';

    try {
      const stats = await fs.statfs(APP_CONFIG.serversRootDir);
      diskSize = stats.blocks * stats.bsize;
      diskFree = stats.bavail * stats.bsize;
      
      if (diskSize > 0) {
        folderVsDiskPercent = ((folderSizeBytes / diskSize) * 100).toFixed(PERCENT_DECIMALS);
      }
    } catch {
      // Fallback if statfs fails on the environment
    }

    return NextResponse.json({
      success: true,
      metrics: {
        container: {
          cpuPercent: containerCpuPercent,
          ramUsedMB: (containerRamBytes / BYTES_PER_MB).toFixed(NO_DECIMALS),
          ramLimitMB: (containerRamLimitBytes / BYTES_PER_MB).toFixed(NO_DECIMALS),
          ramPercent: parseFloat(containerRamPercent),
          ramVsHostPercent: containerVsHostRamPercent,
        },
        storage: {
          folderSizeMB: (folderSizeBytes / BYTES_PER_MB).toFixed(PERCENT_DECIMALS),
          folderSizeGB: (folderSizeBytes / BYTES_PER_GB).toFixed(PERCENT_DECIMALS),
          folderVsDiskPercent: folderVsDiskPercent,
          diskFreeGB: (diskFree / BYTES_PER_GB).toFixed(PERCENT_DECIMALS),
          diskTotalGB: (diskSize / BYTES_PER_GB).toFixed(PERCENT_DECIMALS),
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