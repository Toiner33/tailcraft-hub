import { NextRequest, NextResponse } from 'next/server';
import { getContainerByServerId } from '@/lib/docker';
import { getServerById } from '@/lib/serverRegistry';

function parseDockerLogBuffer(logBuffer: Buffer): string {
  let logsText = '';
  let offset = 0;
  const DOCKER_HEADER_SIZE = 8;
  const PAYLOAD_SIZE_OFFSET = 4;
  const FILE_ENCODING = 'utf-8';

  while (offset < logBuffer.length) {
    if (offset + DOCKER_HEADER_SIZE > logBuffer.length) {
      logsText += logBuffer.subarray(offset).toString(FILE_ENCODING);
      break;
    }
    const payloadSize = logBuffer.readUInt32BE(offset + PAYLOAD_SIZE_OFFSET);
    const payloadStart = offset + DOCKER_HEADER_SIZE;
    const payloadEnd = Math.min(payloadStart + payloadSize, logBuffer.length);

    logsText += logBuffer.subarray(payloadStart, payloadEnd).toString(FILE_ENCODING);
    offset = payloadEnd;
  }

  // Strip ANSI color/style escape codes so logs are clean plain text
  const cleanLogs = logsText.replace(/\x1b\[[0-9;]*m/g, '');

  return cleanLogs;
}

export async function GET(
  request: NextRequest,
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

    const { searchParams } = new URL(request.url);
    const DEFAULT_LOG_LINES = 200;
    const linesParam = searchParams.get('lines');
    const lineCount = linesParam ? parseInt(linesParam, 10) : DEFAULT_LOG_LINES;

    try {
      const container = await getContainerByServerId(server.id);
      const inspectData = await container.inspect();
      const startedAtIso = inspectData.State.StartedAt;
      const MS_TO_SECONDS = 1000;
      const startedAtUnix = Math.floor(new Date(startedAtIso).getTime() / MS_TO_SECONDS);

      const logStream = (await container.logs({
        stdout: true,
        stderr: true,
        tail: lineCount,
        since: startedAtUnix,
        timestamps: false,
      })) as any;

      const logBuffer: Buffer = await new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        if (Buffer.isBuffer(logStream)) {
          return resolve(logStream);
        }
        logStream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        logStream.on('end', () => resolve(Buffer.concat(chunks)));
        logStream.on('error', reject);
      });

      return NextResponse.json({
        success: true,
        logs: parseDockerLogBuffer(logBuffer),
        startedAt: startedAtIso,
      });
    } catch {
      return NextResponse.json({
        success: true,
        logs: 'Server container is not running or has not been started yet.',
        startedAt: null,
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