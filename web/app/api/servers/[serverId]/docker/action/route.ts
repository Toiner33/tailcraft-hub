import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import docker, { getContainerByServerId } from '@/lib/docker';
import { syncGamerulesOnStartup } from '@/lib/gameruleConfig';
import { getServerById } from '@/lib/serverRegistry';
import { APP_CONFIG } from '@/lib/config';
import { ServerProfile } from '@/types/server';
import { DOCKER_ACTIONS, DockerAction, getValidActionsList, isInvalidDockerAction } from '@/types/dockerActions';
import { DOCKER_IMAGE, SERVER_DEFAULTS_FALLBACKS } from '@/lib/constants';

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
    const action = body.action as DockerAction;

    if (isInvalidDockerAction(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Allowed actions: ${getValidActionsList()}` },
        { status: 400 }
      );
    }

    let container;

    // If we are creating the container, we don't look it up first.
    // For other actions, fetch the container instance safely.
    if (action !== DOCKER_ACTIONS.CREATE) {
      try {
        container = await getContainerByServerId(server.id);
      } catch {
        return NextResponse.json(
          { success: false, error: `Container for server ${server.id} has not been created yet.` },
          { status: 400 }
        );
      }
    }

    const MB_TO_BYTES = 1024 * 1024;

    switch (action) {
      case DOCKER_ACTIONS.CREATE: {
        const serverFolder = path.join(APP_CONFIG.serversRootDir, server.id);
        const gamePort = server.gamePort || SERVER_DEFAULTS_FALLBACKS.gamePort;
        const rconPort = server.rcon?.port || SERVER_DEFAULTS_FALLBACKS.rconPort;
        const rconPassword = server.rcon?.password || SERVER_DEFAULTS_FALLBACKS.rconPassword;
        const memoryStr = `${server.memoryMB || SERVER_DEFAULTS_FALLBACKS.memoryMB}M`;

        container = await docker.createContainer({
          name: `${server.id}`,
          Image: `${DOCKER_IMAGE.name}:${DOCKER_IMAGE.tag}`,
          Env: [
            'EULA=TRUE', // Accept the Minecraft EULA, required for the server to run.
            `TYPE=${server.engine || SERVER_DEFAULTS_FALLBACKS.engine}`,
            `VERSION=${server.version || SERVER_DEFAULTS_FALLBACKS.version}`,
            `MEMORY=${memoryStr}`,
            'ENABLE_RCON=true', // Enable RCON for remote console access. Required for Tailcraft Hub.
            `RCON_PASSWORD=${rconPassword}`,
            `RCON_PORT=${rconPort}`,
          ],
          ExposedPorts: {
            [`${gamePort}/tcp`]: {},
            [`${rconPort}/tcp`]: {},
          },
          HostConfig: {
            PortBindings: {
              [`${gamePort}/tcp`]: [{ HostPort: String(gamePort) }],
              [`${rconPort}/tcp`]: [{ HostPort: String(rconPort) }],
            },
            Binds: [
              `${serverFolder}:${DOCKER_IMAGE.data_folder}`,
            ],
            RestartPolicy: { Name: 'unless-stopped' },
            Memory: (server.memoryMB || SERVER_DEFAULTS_FALLBACKS.memoryMB) * MB_TO_BYTES,
          },
        });

        await container.start();
        scheduleGameruleSync(server, 0, DOCKER_ACTIONS.CREATE);
        break;
      }

      case DOCKER_ACTIONS.START:
        if (!container) throw new Error('Container instance is missing.');
        await container.start();
        scheduleGameruleSync(server, 0, DOCKER_ACTIONS.START);
        break;

      case DOCKER_ACTIONS.STOP:
        if (!container) throw new Error('Container instance is missing.');
        await container.stop();
        break;

      case DOCKER_ACTIONS.RESTART:
        if (!container) throw new Error('Container instance is missing.');
        await container.restart();
        scheduleGameruleSync(server, 5000, DOCKER_ACTIONS.RESTART);
        break;

      case DOCKER_ACTIONS.DELETE:
        if (!container) throw new Error('Container instance is missing.');
        // force: true automatically stops and removes the container whether it's running or stopped
        await container.remove({ force: true });
        break;
    }

    return NextResponse.json({
      success: true,
      message: `Container action '${action}' executed successfully.`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}