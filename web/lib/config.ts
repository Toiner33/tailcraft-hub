import path from 'path';

export const APP_CONFIG = {
// === Defaults paths for general tailcraft-hub application ===

  // Configs folder for servers.json and dashboard settings
  configsDir: process.env.TAILCRAFT_CONFIGS_DIR 
    ? path.resolve(process.env.TAILCRAFT_CONFIGS_DIR)
    : path.resolve(process.cwd(), 'configs'),
    
  serversFile: process.env.TAILCRAFT_SERVERS_FILE 
    ? path.resolve(process.env.TAILCRAFT_SERVERS_FILE)
    : path.resolve(process.cwd(), 'configs/servers.json'),
    
  // Isolated Minecraft server world/data folders
  serversRootDir: process.env.TAILCRAFT_SERVERS_ROOT 
    ? path.resolve(process.env.TAILCRAFT_SERVERS_ROOT)
    : path.resolve(process.cwd(), 'servers'),

// === Defaults values for each server ===

  // Default world name for all minecraft servers.
  worldDir: process.env.WORLD_FOLDER_NAME || 'world',
  // Default backups directory for all minecraft servers.
  backupsDir: process.env.BACKUPS_DIR || 'backups',
  // Default file name and extension for properties.
  serverProperties: process.env.SERVER_PROPERTIES || 'server.properties',

  defaults: {
    gamePort: 25565,
    rconPort: 25575,
    memoryMB: 2048,
    version: 'latest',
    engine: 'PAPER' as const,
  },
} as const;