import { NextResponse } from 'next/server';
import { getContainerByServerId } from '@/lib/docker';

export async function GET(
  request: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const container = await getContainerByServerId(params.serverId);

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
