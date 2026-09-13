export type GameruleType = 'boolean' | 'integer';

export type GameruleCategory =
  | 'Player & Spawning'
  | 'World Mechanics'
  | 'Drops & Loot'
  | 'Mobs & Entities'
  | 'Miscellaneous';

export interface GameruleDefinition {
  name: string;
  category: GameruleCategory;
  type: GameruleType;
  defaultValue: boolean | number;
  description: string;
  min?: number;
  max?: number;
}

export const GAMERULES: readonly GameruleDefinition[] = [
  // --- Player & Spawning ---
  { name: 'immediate_respawn', category: 'Player & Spawning', type: 'boolean', defaultValue: false, description: 'Players respawn immediately without showing the death screen.' },
  { name: 'keep_inventory', category: 'Player & Spawning', type: 'boolean', defaultValue: false, description: 'Players retain items and XP after death.' },
  { name: 'natural_regeneration', category: 'Player & Spawning', type: 'boolean', defaultValue: true, description: 'Allows players to naturally regenerate health when full on hunger.' },
  { name: 'players_sleeping_percentage', category: 'Player & Spawning', type: 'integer', defaultValue: 100, min: 0, max: 100, description: 'Percentage of players required to sleep to skip night.' },
  { name: 'spawn_radius', category: 'Player & Spawning', type: 'integer', defaultValue: 10, min: 0, description: 'Radius in blocks around world spawn where non-op players spawn.' },
  { name: 'spectators_generate_chunks', category: 'Player & Spawning', type: 'boolean', defaultValue: true, description: 'Allows spectators to generate new world chunks.' },

  // --- World Mechanics ---
  { name: 'advance_time', category: 'World Mechanics', type: 'boolean', defaultValue: true, description: 'Enables daylight cycle and time progressing.' },
  { name: 'advance_weather', category: 'World Mechanics', type: 'boolean', defaultValue: true, description: 'Enables weather changes (rain, thunder).' },
  { name: 'fire_spread_radius_around_player', category: 'World Mechanics', type: 'integer', defaultValue: 128, min: -1, description: 'Controls fire spreading radius around players (0 = off).' },
  { name: 'do_vines_spread', category: 'World Mechanics', type: 'boolean', defaultValue: true, description: 'Controls whether vines spread to adjacent blocks.' },
  { name: 'random_tick_speed', category: 'World Mechanics', type: 'integer', defaultValue: 3, min: 0, description: 'Speed of random block tick updates (crops, leaf decay).' },

  // --- Drops & Loot ---
  { name: 'entity_drops', category: 'Drops & Loot', type: 'boolean', defaultValue: true, description: 'Controls whether non-mob entities drop items when destroyed.' },
  { name: 'mob_drops', category: 'Drops & Loot', type: 'boolean', defaultValue: true, description: 'Controls whether mobs drop loot when killed.' },
  { name: 'block_drops', category: 'Drops & Loot', type: 'boolean', defaultValue: true, description: 'Controls whether blocks drop items when broken.' },

  // --- Mobs & Entities ---
  { name: 'spawn_mobs', category: 'Mobs & Entities', type: 'boolean', defaultValue: true, description: 'Controls natural mob spawning in loaded chunks.' },
  { name: 'do_patrol_spawning', category: 'Mobs & Entities', type: 'boolean', defaultValue: true, description: 'Controls Pillager Patrol spawning.' },
  { name: 'do_trader_spawning', category: 'Mobs & Entities', type: 'boolean', defaultValue: true, description: 'Controls Wandering Trader spawning.' },
  { name: 'do_warden_spawning', category: 'Mobs & Entities', type: 'boolean', defaultValue: true, description: 'Controls Warden spawning in deep dark biomes.' },
  { name: 'mob_griefing', category: 'Mobs & Entities', type: 'boolean', defaultValue: true, description: 'Allows Creepers, Endermen, and Ghasts to modify blocks.' },
  { name: 'max_command_chain_length', category: 'Mobs & Entities', type: 'integer', defaultValue: 65536, min: 0, description: 'Maximum chain length for command blocks.' },

  // --- Miscellaneous ---
  { name: 'command_block_output', category: 'Miscellaneous', type: 'boolean', defaultValue: true, description: 'Broadcasts command block execution outputs to chat.' },
  { name: 'log_admin_commands', category: 'Miscellaneous', type: 'boolean', defaultValue: true, description: 'Logs admin commands to server log file.' },
  { name: 'show_death_messages', category: 'Miscellaneous', type: 'boolean', defaultValue: true, description: 'Shows player death messages in global chat.' },
  { name: 'send_command_feedback', category: 'Miscellaneous', type: 'boolean', defaultValue: true, description: 'Sends command feedback in chat when executed by players.' }
] as const;

export const GAMERULE_CATEGORIES: GameruleCategory[] = [
  'Player & Spawning',
  'World Mechanics',
  'Drops & Loot',
  'Mobs & Entities',
  'Miscellaneous',
];