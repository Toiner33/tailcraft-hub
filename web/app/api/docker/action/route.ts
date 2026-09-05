import { NextRequest, NextResponse } from 'next/server';
import docker from '@/lib/docker';

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

    // Execute requested Docker action
    if (action === 'start') {
      await container.start();
    } else if (action === 'stop') {
      await container.stop();
    } else if (action === 'restart') {
      await container.restart();
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
