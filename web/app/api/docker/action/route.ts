import { NextRequest, NextResponse } from 'next/server';
import docker from '@/lib/docker';
import { syncGamerulesOnStartup } from '@/lib/gameruleConfig';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body; // Expected: 'start', 'stop', or 'restart'

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    const containerName = process.env.DOCKER_CONTAINER_NAME || 'tailcraft-mc-local';
    const container = docker.getContainer(containerName);

    if (action === 'start') {
      await container.start();

      // Start polling immediately (0ms initial delay)
      syncGamerulesOnStartup(0).then((result) => {
        if (result.success) {
          console.log(`[Auto-Sync] Applied ${result.syncedCount} gamerules on startup.`);
        } else {
          console.warn(`[Auto-Sync] Failed to sync gamerules: ${result.error}`);
        }
      });

    } else if (action === 'stop') {
      await container.stop();
    } else if (action === 'restart') {
      await container.restart();

      // Wait 5000ms for old RCON socket to drop before polling
      syncGamerulesOnStartup(5000).then((result) => {
        if (result.success) {
          console.log(`[Auto-Sync] Applied ${result.syncedCount} gamerules on restart.`);
        } else {
          console.warn(`[Auto-Sync] Failed to sync gamerules: ${result.error}`);
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Container action '${action}' executed successfully. Gamerules sync queued for RCON ready.`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
