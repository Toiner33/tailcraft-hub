import { RconConnection } from '@/types/rcon';

export type ServerEngine = 
  | 'PAPER' 
  | 'VANILLA' 
  | 'FABRIC' 
  | 'FORGE' 
  | 'PURPUR' 
  | 'SPIGOT';

export const SERVER_ENGINES: { value: ServerEngine; label: string }[] = [
  { value: 'PAPER', label: 'Paper' },
  { value: 'VANILLA', label: 'Vanilla' },
  { value: 'FABRIC', label: 'Fabric' },
  { value: 'FORGE', label: 'Forge' },
  { value: 'PURPUR', label: 'Purpur' },
  { value: 'SPIGOT', label: 'Spigot' },
];

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