import { NextResponse } from 'next/server';
import { getContainerByServerId } from '@/lib/docker';
import { getServerById } from '@/lib/serverRegistry';

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

    try {
      const container = await getContainerByServerId(server.id);
      const data = await container.inspect();

      return NextResponse.json({
        success: true,
        exists: true,
        status: data.State.Status,
        running: data.State.Running,
        startedAt: data.State.StartedAt,
        name: data.Name.replace('/', ''),
      });
    } catch {
      return NextResponse.json({
        success: true,
        exists: false,
        status: 'not created',
        running: false,
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}