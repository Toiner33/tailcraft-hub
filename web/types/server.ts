import { RconConnection } from '@/types/rcon';

export type ServerEngine = 
  | 'PAPER' 
  | 'VANILLA' 
  | 'FABRIC' 
  | 'FORGE' 
  | 'PURPUR' 
  | 'SPIGOT';

export const SERVER_ENGINES_MAP: Record<ServerEngine, EngineProperties> = {
  PAPER: {
    nameId: 'PAPER',
    label: 'Paper',
    description: 'A high-performance fork of Spigot, optimized for speed and stability.',
    versionUrl: 'https://fill.papermc.io/v3/projects/paper',
  },
  VANILLA: {
    nameId: 'VANILLA',
    label: 'Vanilla',
    description: 'The official Minecraft server software provided by Mojang.',
    versionUrl: 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json',
  },
  FABRIC: {
    nameId: 'FABRIC',
    label: 'Fabric',
    description: 'A lightweight modding toolchain for Minecraft, known for its speed and modularity.',
    versionUrl: 'https://meta.fabricmc.net/v2/versions/game',
  },
  FORGE: {
    nameId: 'FORGE',
    label: 'Forge',
    description: 'A popular modding platform that allows for extensive customization of Minecraft.',
    versionUrl: 'https://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions_slim.json',
  },
  PURPUR: {
    nameId: 'PURPUR',
    label: 'Purpur',
    description: 'A fork of Paper with additional features and optimizations for server performance.',
    versionUrl: 'https://api.purpurmc.org/v2/purpur',
  },
  SPIGOT: {
    nameId: 'SPIGOT',
    label: 'Spigot',
    description: 'A high-performance Minecraft server implementation that extends the capabilities of the Vanilla server.',
    versionUrl: 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json',
  },
};

export interface EngineProperties {
  nameId: ServerEngine;
  label: string;
  description: string; // Short description of the engine
  versionUrl?: string; // URL to fetch available versions for this engine

}

export interface ServerProfile {
  id: string;               // Unique ID (e.g., "srv-a1b2c3d")
  name: string;             // Display name
  engine: ServerEngine;     // Engine type
  version: string;          // Minecraft version (e.g., "1.20.4")
  memoryMB: number;         // Allocated RAM in MB
  gamePort: number;         // Public game port (e.g., 25565)
  rcon: RconConnection;     // Encapsulated RCON connection metadata
  containerId?: string;     // Active Docker Container ID (if spawned)
  createdAt: string;        // ISO timestamp
  updatedAt?: string;       // ISO timestamp
}

// Creation payload type
export type CreateServerInput = Omit<
  ServerProfile, 
  'id' | 'createdAt' | 'containerId' | 'gamePort' | 'rcon'
> & {
  gamePort?: number;
  rconPort?: number;
  rconPassword?: string;
};