import { ServerEngine } from '@/types/server';

export const DOCKER_IMAGE = {
  name: 'itzg/minecraft-server',
  tag: 'latest',
  data_folder: '/data',
} as const;

export const SERVER_DEFAULTS_FALLBACKS = {
  gamePort: 25565,
  rconPort: 25575,
  rconPassword: 'strong_password',
  memoryMB: 2048,
  version: 'latest',
  engine: 'PAPER' as ServerEngine,
  worldDir: 'world',
  backupsDir: 'backups',
  serverProperties: 'server.properties',
} as const;