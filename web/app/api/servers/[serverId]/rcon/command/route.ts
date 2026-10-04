import { NextRequest, NextResponse } from 'next/server';
import { sendRconCommand } from '@/lib/rcon';
import { getServerById } from '@/lib/serverRegistry';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;

  // Validate that the target server directory exists.
  const server = await getServerById(serverId);
  if (!server) {
    return NextResponse.json(
      { success: false, error: `Server with ID ${serverId} not found.` },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { command } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Command parameter is required and must be a string.' },
        { status: 400 }
      );
    }

    // Execute command on Minecraft server via RCON
    const response = await sendRconCommand(server.rcon, command);

    return NextResponse.json({
      success: true,
      command,
      response: response || 'Command executed successfully with no output.',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
