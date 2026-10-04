import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { ServerProfile, CreateServerInput } from '@/types/server';
import { APP_CONFIG } from '@/lib/config';
import { resolveRconHost } from '@/lib/rcon';
import { SERVER_DEFAULTS_FALLBACKS } from '@/lib/constants';

const FILE_ENCODING = 'utf-8';

async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function getServers(): Promise<ServerProfile[]> {
  try {
    const data = await fs.readFile(APP_CONFIG.serversFile, FILE_ENCODING);
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw new Error(`Failed to read server configuration: ${error.message}`);
  }
}

export async function saveServers(servers: ServerProfile[]): Promise<void> {
  await ensureDirectory(APP_CONFIG.serversRootDir);
  await fs.writeFile(APP_CONFIG.serversFile, JSON.stringify(servers, null, 2), FILE_ENCODING);
}

export async function getServerById(id: string): Promise<ServerProfile | undefined> {
  const servers = await getServers();
  return servers.find((s) => s.id === id);
}

function resolvePorts(
  input: { gamePort?: number; rconPort?: number },
  existingServers: ServerProfile[]
): { gamePort: number; rconPort: number } {
  const usedPorts = new Set(
    existingServers.flatMap((s) => [s.gamePort, s.rcon.port])
  );

  let gamePort: number;
  if (input.gamePort) {
    if (usedPorts.has(input.gamePort)) {
      throw new Error(`Port ${input.gamePort} is already in use by another server.`);
    }
    gamePort = input.gamePort;
  } else {
    gamePort = SERVER_DEFAULTS_FALLBACKS.gamePort;
    while (usedPorts.has(gamePort)) {
      gamePort++;
    }
  }
  usedPorts.add(gamePort);

  let rconPort: number;
  if (input.rconPort) {
    if (usedPorts.has(input.rconPort)) {
      throw new Error(`RCON Port ${input.rconPort} is already in use by another server.`);
    }
    rconPort = input.rconPort;
  } else {
    rconPort = SERVER_DEFAULTS_FALLBACKS.rconPort;
    while (usedPorts.has(rconPort)) {
      rconPort++;
    }
  }

  return { gamePort, rconPort };
}

export function createServerId(){
  return `srv-${crypto.randomBytes(4).toString('hex')}`;
}

export function createRconPassword(){
  return crypto.randomBytes(8).toString('hex');
}

export async function createServer(input: Partial<CreateServerInput>): Promise<ServerProfile> {
  const servers = await getServers();

  const id = createServerId();
  const serverDir = path.join(APP_CONFIG.serversRootDir, id);

  const { gamePort, rconPort } = resolvePorts(
    { gamePort: input.gamePort, rconPort: input.rconPort },
    servers
  );

  const engine = input.engine || SERVER_DEFAULTS_FALLBACKS.engine;
  const now = new Date().toISOString();

  const newServer: ServerProfile = {
    id,
    name: input.name?.trim() || id,
    engine,
    version: input.version || SERVER_DEFAULTS_FALLBACKS.version,
    memoryMB: input.memoryMB || SERVER_DEFAULTS_FALLBACKS.memoryMB,
    gamePort,
    rcon: {
      host: resolveRconHost(process.env.RCON_HOST),
      port: rconPort,
      password: input.rconPassword || createRconPassword(),
      timeoutMs: 5000,
    },
    createdAt: now,
    updatedAt: now,
  };

  await ensureDirectory(serverDir);
  servers.push(newServer);
  await saveServers(servers);

  return newServer;
}

export async function getServerTemplate() {
  const servers = await getServers();
  const { gamePort, rconPort } = resolvePorts({}, servers);

  const id = createServerId();

  return {
    id,
    name: `Server ${servers.length + 1}`,
    engine: SERVER_DEFAULTS_FALLBACKS.engine,
    version: SERVER_DEFAULTS_FALLBACKS.version,
    memoryMB: SERVER_DEFAULTS_FALLBACKS.memoryMB,
    gamePort,
    rconPort,
    rconPassword: createRconPassword(),
    rconHost: resolveRconHost(process.env.RCON_HOST),
  };
}

export async function updateServer(
  id: string,
  updates: Partial<ServerProfile>
): Promise<ServerProfile> {
  const servers = await getServers();
  const index = servers.findIndex((s) => s.id === id);

  if (index === -1) {
    throw new Error(`Server with ID "${id}" not found.`);
  }

  const updatedServer: ServerProfile = {
    ...servers[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  servers[index] = updatedServer;
  await saveServers(servers);

  return updatedServer;
}

export async function deleteServer(id: string): Promise<void> {
  const servers = await getServers();
  const filtered = servers.filter((s) => s.id !== id);

  if (servers.length === filtered.length) {
    throw new Error(`Server with ID "${id}" does not exist.`);
  }

  await saveServers(filtered);

  const serverDir = path.join(APP_CONFIG.serversRootDir, id);
  try {
    await fs.rm(serverDir, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Warning: Failed to delete working directory for server ${id}:`, err);
  }
}