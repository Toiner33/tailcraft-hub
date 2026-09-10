import { NextRequest, NextResponse } from 'next/server';
import docker from '@/lib/docker';

// Protocol header constants
const DOCKER_HEADER_SIZE = 8;
const PAYLOAD_SIZE_OFFSET = 4;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linesParam = searchParams.get('lines');
    const lineCount = linesParam ? parseInt(linesParam, 10) : 200;

    const containerName = process.env.DOCKER_CONTAINER_NAME || 'tailcraft-mc-local';
    const container = docker.getContainer(containerName);

    // Inspect container to get the current session's start timestamp
    const inspectData = await container.inspect();
    const startedAtIso = inspectData.State.StartedAt;
    const startedAtUnix = Math.floor(new Date(startedAtIso).getTime() / 1000);

    const logBuffer = (await container.logs({
      stdout: true,
      stderr: true,
      tail: lineCount,
      since: startedAtUnix, // Only fetch logs from the current execution session
      timestamps: false,
    })) as Buffer;

    let logsText = '';
    let offset = 0;

    while (offset < logBuffer.length) {
      // If remaining bytes are less than a full header, append remainder and exit
      if (offset + DOCKER_HEADER_SIZE > logBuffer.length) {
        logsText += logBuffer.subarray(offset).toString('utf8');
        break;
      }

      // Read 32-bit uint payload size starting at offset 4
      const payloadSize = logBuffer.readUInt32BE(offset + PAYLOAD_SIZE_OFFSET);
      const payloadStart = offset + DOCKER_HEADER_SIZE;
      const payloadEnd = Math.min(payloadStart + payloadSize, logBuffer.length);

      logsText += logBuffer.subarray(payloadStart, payloadEnd).toString('utf8');
      offset = payloadEnd; // Advance memory pointer to next frame
    }

    return NextResponse.json({
      success: true,
      logs: logsText,
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