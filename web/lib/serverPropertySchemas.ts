/**
 * How each server.properties key should be edited in the UI.
 * Keys that are not listed fall back to a guess based on their current value
 * (see `resolvePropertySchema`).
 *
 * Ranges follow vanilla Minecraft Java Edition. Reference:
 * https://minecraft.wiki/w/Server.properties
 */

export type PropertySchema =
  | { kind: 'enum'; options: readonly string[] }
  | { kind: 'integer'; min?: number; max?: number; step?: number }
  | { kind: 'text' };

export type ResolvedPropertySchema = PropertySchema | { kind: 'boolean' };

const TEXT: PropertySchema = { kind: 'text' };

export const PROPERTY_SCHEMAS: Record<string, PropertySchema> = {
  gamemode: { kind: 'enum', options: ['survival', 'creative', 'adventure', 'spectator'] },
  difficulty: { kind: 'enum', options: ['peaceful', 'easy', 'normal', 'hard'] },
  'level-type': {
    kind: 'enum',
    options: [
      'minecraft:normal',
      'minecraft:flat',
      'minecraft:large_biomes',
      'minecraft:amplified',
      'minecraft:single_biome_surface',
      'normal',
      'flat',
      'large_biomes',
      'amplified',
    ],
  },

  'max-players': { kind: 'integer', min: 1 },
  'view-distance': { kind: 'integer', min: 3, max: 32 },
  'simulation-distance': { kind: 'integer', min: 3, max: 32 },
  'spawn-protection': { kind: 'integer', min: 0 },
  'max-world-size': { kind: 'integer', min: 1, max: 29999984 },
  'player-idle-timeout': { kind: 'integer', min: 0 },
  'op-permission-level': { kind: 'integer', min: 0, max: 4 },
  'function-permission-level': { kind: 'integer', min: 1, max: 4 },
  'max-tick-time': { kind: 'integer', min: -1 },
  'network-compression-threshold': { kind: 'integer', min: -1 },
  'rate-limit': { kind: 'integer', min: 0 },
  'entity-broadcast-range-percentage': { kind: 'integer', min: 10, max: 1000 },

  // Text, even when the current value happens to look like a number
  // (a numeric seed can exceed what a JavaScript number stores exactly).
  'level-seed': TEXT,
  'level-name': TEXT,
  motd: TEXT,
  'rcon.password': TEXT,
  'server-ip': TEXT,
};

export function resolvePropertySchema(key: string, value: string): ResolvedPropertySchema {
  const known = PROPERTY_SCHEMAS[key];
  if (known) return known;

  if (value === 'true' || value === 'false') return { kind: 'boolean' };

  // Only treat plain integers that a JavaScript number can hold exactly as numbers.
  if (value.trim() !== '' && Number.isSafeInteger(Number(value))) return { kind: 'integer' };

  return TEXT;
}
