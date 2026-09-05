import { Rcon } from 'rcon-client';

export async function sendRconCommand(command: string): Promise<string> {
  const host = process.env.RCON_HOST || 'localhost';
  const port = parseInt(process.env.RCON_PORT || '25575', 10);
  const password = process.env.RCON_PASSWORD;

  if (!password) {
    throw new Error('RCON_PASSWORD is missing in environment variables.');
  }

  // Connect and authenticate with the Minecraft server
  const rcon = await Rcon.connect({ host, port, password });
  
  try {
    // Send in-game command (e.g., "list", "time set day")
    const response = await rcon.send(command);
    await rcon.end();
    return response;
  } catch (error) {
    await rcon.end();
    throw error;
  }
}
