import path from 'path';
import { SERVER_DEFAULTS_FALLBACKS } from '@/lib/constants';

// Safely determine the project root (root/) regardless of execution context
const cwd = process.cwd();
const projectRoot = path.basename(cwd) === 'web'
  ? path.resolve(cwd, '..')
  : cwd;

const serversRootDir = process.env.TAILCRAFT_SERVERS_ROOT 
  ? path.resolve(process.env.TAILCRAFT_SERVERS_ROOT)
  : path.join(projectRoot, 'servers');

export const APP_CONFIG = {
  // === Defaults paths for general tailcraft-hub application ===    
  serversRootDir: serversRootDir,
    
  serversFile: process.env.TAILCRAFT_SERVERS_FILE 
    ? path.resolve(process.env.TAILCRAFT_SERVERS_FILE)
    : path.join(serversRootDir, 'servers.json'),

  // === Defaults values for each server ===
  worldDir: process.env.WORLD_FOLDER_NAME || SERVER_DEFAULTS_FALLBACKS.worldDir,
  backupsDir: process.env.BACKUPS_DIR || SERVER_DEFAULTS_FALLBACKS.backupsDir,
  serverProperties: process.env.SERVER_PROPERTIES || SERVER_DEFAULTS_FALLBACKS.serverProperties,
} as const;