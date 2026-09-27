import { NextRequest, NextResponse } from 'next/server';
import { getContainerByServerId } from '@/lib/docker';
import { getServerById } from '@/lib/serverRegistry';



/**
 * Parses Docker's multiplexed stream buffer (stripping 8-byte frame headers).
 * See Docker Remote API documentation on multiplexed streams.
 */
function parseDockerLogBuffer(logBuffer: Buffer): string {
  let logsText = '';
  let offset = 0;
  
  // Protocol header constants for Docker demuxing
  const DOCKER_HEADER_SIZE = 8;
  const PAYLOAD_SIZE_OFFSET = 4;
  const FILE_ENCODING = 'utf-8';

  while (offset < logBuffer.length) {
    // If remaining bytes are less than a full header, append remainder and exit
    if (offset + DOCKER_HEADER_SIZE > logBuffer.length) {
      logsText += logBuffer.subarray(offset).toString(FILE_ENCODING);
      break;
    }

    // Read 32-bit uint payload size starting at offset PAYLOAD_SIZE_OFFSET
    const payloadSize = logBuffer.readUInt32BE(offset + PAYLOAD_SIZE_OFFSET);
    const payloadStart = offset + DOCKER_HEADER_SIZE;
    const payloadEnd = Math.min(payloadStart + payloadSize, logBuffer.length);

    logsText += logBuffer.subarray(payloadStart, payloadEnd).toString(FILE_ENCODING);
    offset = payloadEnd; // Advance memory pointer to next frame
  }

  return logsText;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const { serverId } = params;

    // Validate target server exists in registry
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const DEFAULT_LOG_LINES = 200;
    const linesParam = searchParams.get('lines');
    const lineCount = linesParam ? parseInt(linesParam, 10) : DEFAULT_LOG_LINES;

    // Fetch container using the validated server ID
    const container = await getContainerByServerId(server.id);

    // Inspect container to get current session's start timestamp
    const inspectData = await container.inspect();
    const startedAtIso = inspectData.State.StartedAt;
    const MS_TO_SECONDS = 1000;
    const startedAtUnix = Math.floor(new Date(startedAtIso).getTime() / MS_TO_SECONDS);

    const logBuffer = (await container.logs({
      stdout: true,
      stderr: true,
      tail: lineCount,
      since: startedAtUnix,
      timestamps: false,
    })) as Buffer;

    return NextResponse.json({
      success: true,
      logs: parseDockerLogBuffer(logBuffer),
      startedAt: startedAtIso,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}