import { Rcon } from 'rcon-client';

const RCON_HOST = process.env.RCON_HOST || '127.0.0.1';
const RCON_PORT = parseInt(process.env.RCON_PORT || '25575', 10);
const RCON_PASSWORD = process.env.RCON_PASSWORD || '';

/**
 * Executes multiple commands over a SINGLE RCON connection session
 * to prevent thread flooding and log spam.
 */
export async function sendRconBatch(commands: string[]): Promise<string[]> {
  const rcon = new Rcon({
    host: RCON_HOST,
    port: RCON_PORT,
    password: RCON_PASSWORD,
    timeout: 5000,
  });

  await rcon.connect();
  const responses: string[] = [];

  try {
    for (const cmd of commands) {
      const res = await rcon.send(cmd);
      responses.push(res);
    }
  } finally {
    await rcon.end();
  }

  return responses;
}

export async function sendRconCommand(command: string): Promise<string> {
  const [res] = await sendRconBatch([command]);
  return res;
}