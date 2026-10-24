import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { APP_CONFIG } from '@/lib/config';
import { getServerById } from '@/lib/serverRegistry';
import { parseProperties, serializeProperties, getLockedSystemProperties } from '@/lib/serverProperties';

const FILE_ENCODING = 'utf-8';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try { 
    const { serverId } = await params;

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
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;

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