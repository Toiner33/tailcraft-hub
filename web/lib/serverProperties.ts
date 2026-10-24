import fs from 'fs/promises';
import path from 'path';
import { APP_CONFIG } from '@/lib/config';
import { ServerProfile } from '@/types/server';

const FILE_ENCODING = 'utf-8';

/**
 * Returns system-critical locked properties bound to this specific server's allocated ports.
 */
export function getLockedSystemProperties(server: ServerProfile): Record<string, string> {
  return {
    'enable-rcon': 'true',
    'rcon.port': server.rcon.port.toString(),
    'server-port': server.gamePort.toString(),
  };
}

/**
 * Parses a raw server.properties file string into a key-value record.
 */
export function parsePropertiesContent(content: string): Record<string, string> {
  const properties: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    // Sentinel value for invalid or missing character
    const SEPARATOR_NOT_FOUND = -1;
    if (separatorIndex !== SEPARATOR_NOT_FOUND) {
      const key = trimmed.substring(0, separatorIndex).trim();
      let value = trimmed.substring(separatorIndex + 1).trim();

      // Clean backslashes before colons (e.g. minecraft\:normal -> minecraft:normal)
      value = value.replace(/\\:/g, ':');
      properties[key] = value;
    }
  }

  return properties;
}

/**
 * Parses properties and enforces server-specific locked system values over user inputs.
 */
export function parseProperties(content: string, server: ServerProfile): Record<string, string> {
  const properties = parsePropertiesContent(content);
  return { ...properties, ...getLockedSystemProperties(server) };
}

/**
 * Serializes properties into a valid server.properties string file format.
 */
export function serializeProperties(properties: Record<string, string>, server: ServerProfile): string {
  // Always enforce server's unique assigned ports & RCON rules before writing
  const safeProperties = { ...properties, ...getLockedSystemProperties(server) };

  let output = `# Minecraft server properties\n# Managed by TailCraft Hub for ${server.id}\n`;
  for (const [key, value] of Object.entries(safeProperties)) {
    const cleanValue = String(value).replace(/\\:/g, ':');
    output += `${key}=${cleanValue}\n`;
  }
  return output;
}

/**
 * Dynamically resolves the active world folder name (`level-name`) from server.properties.
 * Falls back to APP_CONFIG.worldDir ('world') if unreadable or not specified.
 */
export async function getWorldDirName(serverId: string): Promise<string> {
  try {
    const propertiesPath = path.join(APP_CONFIG.serversRootDir, serverId, APP_CONFIG.serverProperties);
    const fileContent = await fs.readFile(propertiesPath, FILE_ENCODING);
    const properties = parsePropertiesContent(fileContent);

    if (properties['level-name'] && properties['level-name'].trim().length > 0) {
      return properties['level-name'].trim();
    }
  } catch {
    // If file doesn't exist or fails to read, use the default fallback
  }

  return APP_CONFIG.worldDir || 'world';
}