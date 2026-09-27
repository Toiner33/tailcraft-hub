import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { APP_CONFIG } from '@/lib/config';
import { getServerById } from '@/lib/serverRegistry';
import { ServerProfile } from '@/types/server';

const FILE_ENCODING = 'utf-8';

/**
 * Returns system-critical locked properties bound to this specific server's allocated ports.
 */
function getLockedSystemProperties(server: ServerProfile): Record<string, string> {
  return {
    'enable-rcon': 'true',
    'rcon.port': server.rcon.port.toString(),
    'server-port': server.gamePort.toString(),
  };
}

function parseProperties(content: string, server: ServerProfile): Record<string, string> {
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

  // Enforce server-specific locked system values over user inputs
  return { ...properties, ...getLockedSystemProperties(server) };
}

function serializeProperties(properties: Record<string, string>, server: ServerProfile): string {
  // Always enforce server's unique assigned ports & RCON rules before writing
  const safeProperties = { ...properties, ...getLockedSystemProperties(server) };

  let output = `# Minecraft server properties\n# Managed by TailCraft Hub for ${server.id}\n`;
  for (const [key, value] of Object.entries(safeProperties)) {
    const cleanValue = String(value).replace(/\\:/g, ':');
    output += `${key}=${cleanValue}\n`;
  }
  return output;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try { 
    const { serverId } = params;

    // Validate that the target server exists.
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json({ success: false, error: `Server with ID ${serverId} not found.` }, { status: 404 });
    }

    const propertiesPath = path.join(APP_CONFIG.serversRootDir, server.id, APP_CONFIG.serverProperties);

    // Read and parse properties
    let fileContent = '';
    try {
      fileContent = await fs.readFile(propertiesPath, FILE_ENCODING);
    } catch {
      // If server.properties doesn't exist yet, default to empty string so parser applies locked defaults
      fileContent = '';
    }

    return NextResponse.json({
      success: true,
      properties: parseProperties(fileContent, server),
      lockedKeys: Object.keys(getLockedSystemProperties(server)),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to read server.properties';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const { serverId } = params;

    // Validate that the target server exists.
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json({ success: false, error: `Server with ID ${serverId} not found.` }, { status: 404 });
    }

    // Validate the request body contains a valid properties object
    const body = await request.json();
    const { properties } = body;

    if (!properties || typeof properties !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid properties payload' }, { status: 400 });
    }

    const propertiesPath = path.join(APP_CONFIG.serversRootDir, server.id, APP_CONFIG.serverProperties);
    
    // Ensure parent server directory exists
    await fs.mkdir(path.dirname(propertiesPath), { recursive: true });

    const updatedContent = serializeProperties(properties, server);
    await fs.writeFile(propertiesPath, updatedContent, FILE_ENCODING);

    return NextResponse.json({
      success: true,
      message: 'server.properties saved successfully.',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to write server.properties';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}