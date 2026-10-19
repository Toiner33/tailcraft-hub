import { NextRequest, NextResponse } from 'next/server';
import { deleteServer, getServerById, updateServer } from '@/lib/serverRegistry';
import { getContainerByServerId } from '@/lib/docker';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;

    // Validate that the target server directory exists.
    const server = await getServerById(serverId);
    if (!server) {
        return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
        );
    }

    // Ensure any lingering container is also nuked when deleting the profile.
    try {
      const container = await getContainerByServerId(serverId);
      await container.remove({ force: true });
    } catch {
      // Container might already be gone, in that case just continue.
    }

    // Remove the entry from your JSON registry
    await deleteServer(serverId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete server' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    const body = await request.json();

    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    const updatedServer = await updateServer(serverId, body);

    return NextResponse.json({ success: true, server: updatedServer });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update server' },
      { status: 500 }
    );
  }
}