import { NextRequest, NextResponse } from 'next/server';
import docker from '@/lib/docker';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linesParam = searchParams.get('lines');
    const lineCount = linesParam ? parseInt(linesParam, 10) : 200;

    const containerName = process.env.DOCKER_CONTAINER_NAME || 'tailcraft-mc-local';
    const container = docker.getContainer(containerName);

    const logBuffer = (await container.logs({
      stdout: true,
      stderr: true,
      tail: lineCount,
      timestamps: false,
    })) as Buffer;

    // Define protocol header constants at the top of the file
    const DOCKER_HEADER_SIZE = 8;
    const PAYLOAD_SIZE_OFFSET = 4;

    let logsText = '';
    let offset = 0;

    while (offset < logBuffer.length) {
    // If remaining bytes are less than a full header, break
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
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
