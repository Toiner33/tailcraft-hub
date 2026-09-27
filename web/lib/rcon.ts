import { Rcon } from 'rcon-client';
import { RconConnection, RconCommandResult } from '@/types/rcon';

const LOCALHOST_IP_FALLBACK = '127.0.0.1';
const LOCALHOST_HOSTNAME_FALLBACK = 'localhost';

/**
 * Safely resolves an unknown host value to a valid IP/hostname string.
 * Fallbacks: explicit host -> process.env.RCON_HOST -> '127.0.0.1'
 */
export function resolveRconHost(host?: unknown): string {
  if (typeof host === 'string' && host.trim().length > 0) {
    return host.trim();
  }
  return process.env.RCON_HOST || LOCALHOST_IP_FALLBACK || LOCALHOST_HOSTNAME_FALLBACK;
}

/**
 * Executes a single RCON command safely, wrapping success/failure inside RconCommandResult.
 */
export async function sendRconCommand(
  connection: RconConnection,
  command: string
): Promise<RconCommandResult> {
  const rcon = new Rcon({
    host: resolveRconHost(connection.host),
    port: connection.port || parseInt(process.env.RCON_PORT || '25575', 10),
    password: connection.password || process.env.RCON_PASSWORD || '',
    timeout: connection.timeoutMs ?? 5000,
  });

  try {
    await rcon.connect();
    const response = await rcon.send(command);
    await rcon.end();

    return {
      success: true,
      response,
    };
  } catch (error: any) {
    // Gracefully capture socket/timeout/auth errors without crashing calling handlers
    return {
      success: false,
      error: error.message || 'Failed to execute RCON command.',
    };
  }
}

/**
 * Executes multiple commands over a SINGLE RCON session to prevent socket flooding.
 * Returns a single unified RconCommandResult for the entire batch execution.
 * and a responses array for individual command responses.
 */
export async function sendRconBatch(
  connection: RconConnection,
  commands: string[]
): Promise<RconCommandResult> {
  if (commands.length === 0) {
    return { success: true, response: '', responses: [] };
  }

  const rcon = new Rcon({
    host: resolveRconHost(connection.host),
    port: connection.port || parseInt(process.env.RCON_PORT || '25575', 10),
    password: connection.password || process.env.RCON_PASSWORD || '',
    timeout: connection.timeoutMs ?? 5000,
  });

  try {
    await rcon.connect();
    
    const responses: string[] = [];
    let failedCount = 0;

    for (const cmd of commands) {
      try {
        const res = await rcon.send(cmd);
        responses.push(res);
      } catch {
        responses.push(''); // Push empty string to keep index alignment even if a command fails
        failedCount++;
      }
    }

    await rcon.end();

    if (failedCount > 0) {
      return {
        success: false,
        response: responses.join('\n'),
        responses,
        error: `Batch completed with ${failedCount} failed command${failedCount > 1 ? 's' : ''} out of ${commands.length}.`,
      };
    }

    return {
      success: true,
      response: responses.join('\n'),
      responses,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Could not establish RCON connection for batch execution.',
    };
  }
}

/**
 * Polls RCON until connected or times out.
 */
export async function waitForRcon(
  connection: RconConnection,
  maxRetries = 60,
  delayMs = 2500
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await sendRconCommand(connection, 'seed');
    if (result.success) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}