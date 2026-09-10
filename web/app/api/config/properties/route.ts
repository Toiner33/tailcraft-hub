import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Clean direct path to data volume
const PROPERTIES_PATH = path.resolve(process.cwd(), '../data/server.properties');

// Sentinel value for invalid or missing character
const SEPARATOR_NOT_FOUND = -1;

// System critical locked properties required for TailCraft Hub functionality
export const LOCKED_SYSTEM_PROPERTIES: Record<string, string> = {
  'enable-rcon': 'true',
  'rcon.port': '25575',
  'server-port': '25565',
};

function parseProperties(content: string): Record<string, string> {
  const properties: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex !== SEPARATOR_NOT_FOUND) {
      const key = trimmed.substring(0, separatorIndex).trim();
      let value = trimmed.substring(separatorIndex + 1).trim();

      // Clean survived backslashes before colons (e.g. minecraft\:normal -> minecraft:normal)
      value = value.replace(/\\:/g, ':');
      properties[key] = value;
    }
  }

  // Ensure critical system values are strictly enforced
  return { ...properties, ...LOCKED_SYSTEM_PROPERTIES };
}

function serializeProperties(properties: Record<string, string>): string {
  // Always enforce critical system properties before writing to disk
  const safeProperties = { ...properties, ...LOCKED_SYSTEM_PROPERTIES };

  let output = `# Minecraft server properties\n# Managed by TailCraft Hub\n`;
  for (const [key, value] of Object.entries(safeProperties)) {
    // Sanitize any backslashes before writing
    const cleanValue = String(value).replace(/\\:/g, ':');
    output += `${key}=${cleanValue}\n`;
  }
  return output;
}

export async function GET() {
  try {
    const fileContent = await fs.readFile(PROPERTIES_PATH, 'utf-8');
    const properties = parseProperties(fileContent);

    return NextResponse.json({
      success: true,
      properties,
      lockedKeys: Object.keys(LOCKED_SYSTEM_PROPERTIES),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to read server.properties';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { properties } = body;

    if (!properties || typeof properties !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid properties payload' }, { status: 400 });
    }

    const updatedContent = serializeProperties(properties);
    await fs.writeFile(PROPERTIES_PATH, updatedContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'server.properties saved successfully.',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to write server.properties';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}