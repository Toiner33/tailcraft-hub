import { NextRequest, NextResponse } from 'next/server';
import { sendRconCommand } from '@/lib/rcon';

export async function POST(request: NextRequest) {
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
    const response = await sendRconCommand(command);

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
