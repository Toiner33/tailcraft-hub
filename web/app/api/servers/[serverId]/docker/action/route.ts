import { NextRequest, NextResponse } from 'next/server';
import { getContainerByServerId } from '@/lib/docker';
import { syncGamerulesOnStartup } from '@/lib/gameruleConfig';
import { getServerById } from '@/lib/serverRegistry';
import { ServerProfile } from '@/types/server';

// Define valid actions cleanly using a readonly tuple type
const START_ACTION = 'start' as const;
const STOP_ACTION = 'stop' as const;
const RESTART_ACTION = 'restart' as const;
const VALID_ACTIONS = [START_ACTION, STOP_ACTION, RESTART_ACTION] as const;
type DockerAction = (typeof VALID_ACTIONS)[number];

/**
 * Helper to handle background gamerule sync after container boot or restart.
 */
function scheduleGameruleSync(server: ServerProfile, delayMs: number, eventLabel: string) {
  syncGamerulesOnStartup(server, delayMs).then((result) => {
    if (result.success) {
      console.log(`[Auto-Sync] Applied ${result.syncedCount} gamerules on ${eventLabel}.`);
    } else {
      console.warn(`[Auto-Sync] Failed to sync gamerules on ${eventLabel}: ${result.error}`);
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const { serverId } = params;

    // Validate server existence
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    // Validate request body and action type
    const body = await request.json();
    const action = body.action as DockerAction;

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Allowed actions: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const container = await getContainerByServerId(server.id);

    // Execute container action and handle background RCON gamerule syncing
    switch (action) {
      case START_ACTION:
        await container.start();
        scheduleGameruleSync(server, 0, START_ACTION);
        break;

      case STOP_ACTION:
        await container.stop();
        break;

      case RESTART_ACTION:
        await container.restart();
        // Wait 5000ms for old RCON socket to drop before polling
        const RCON_WAITING_DELAY_MS = 5000;
        scheduleGameruleSync(server, RCON_WAITING_DELAY_MS, RESTART_ACTION);
        break;
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