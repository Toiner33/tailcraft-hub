import { NextResponse } from 'next/server';
import docker from '@/lib/docker';

export async function GET() {
  try {
    const containerName = process.env.DOCKER_CONTAINER_NAME || 'tailcraft-mc-local';
    const container = docker.getContainer(containerName);

    // Fetch container details
    const data = await container.inspect();

    return NextResponse.json({
      success: true,
      status: data.State.Status, // e.g., 'running', 'exited', 'restarting'
      running: data.State.Running,
      startedAt: data.State.StartedAt,
      name: data.Name.replace('/', ''),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        status: 'offline',
        running: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
