import { NextRequest, NextResponse } from 'next/server';
import { sendRconBatch, sendRconCommand } from '@/lib/rcon';
import { GAMERULES } from '@/types/gamerules';
import { RconCommandResult } from '@/types/rcon';
import { readGameruleConfig, saveGameruleConfig } from '@/lib/gameruleConfig';
import { getServerById } from '@/lib/serverRegistry';

const LEGACY_GAMERULE_PREFIX = 'minecraft:';

function parseValue(response: string, type: 'boolean' | 'integer'): boolean | number | null {
  if (!response) return null;
  const clean = response.trim();

  if (type === 'boolean') {
    if (/\btrue\b/i.test(clean)) return true;
    if (/\bfalse\b/i.test(clean)) return false;
  } else {
    const match = clean.match(/:\s*(-?\d+)|=\s*(-?\d+)|\b(-?\d+)\b/);
    if (match) {
      const numStr = match[1] || match[2] || match[3];
      return parseInt(numStr, 10);
    }
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { serverId: string } }
) {
  const { serverId } = params;

  // Validate that the target server exists.
  const server = await getServerById(serverId);
  if (!server) {
    return NextResponse.json(
      { success: false, error: `Server with ID ${serverId} not found.` },
      { status: 404 }
    );
  }

  const results: Record<string, boolean | number> = {};
  const savedConfig = await readGameruleConfig(server);
  let isLive = false;

  try {
    // Attempt live RCON status fetch
    const commands = GAMERULES.map((rule) => `gamerule ${rule.name}`);
    const rconResult = await sendRconBatch(server.rcon, commands);

    // If batch succeeded and responses array is present, parse live values
    if (rconResult.success && rconResult.responses) {
      isLive = true;
      GAMERULES.forEach((rule, index) => {
        const resp = rconResult.responses?.[index] || '';
        const parsed = parseValue(resp, rule.type);
        const cleanName = rule.name.replace(LEGACY_GAMERULE_PREFIX, '');

        results[rule.name] = parsed ?? savedConfig[cleanName] ?? rule.defaultValue;
      });
    } else {
      throw new Error(rconResult.error || 'RCON batch failed');
    }
  } catch {
    // Fallback: Read from local JSON config when offline
    isLive = false;
    for (const rule of GAMERULES) {
      const cleanName = rule.name.replace(LEGACY_GAMERULE_PREFIX, '');
      results[rule.name] = savedConfig[cleanName] ?? rule.defaultValue;
    }
  }

  return NextResponse.json({
    success: true,
    isLive,
    gamerules: results,
    warning: isLive ? null : 'Server offline. Reading/editing local JSON configuration.',
  });
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
      return NextResponse.json(
        { success: false, error: `Server with ID ${serverId} not found.` },
        { status: 404 }
      );
    }

    // Validate that the request body contains a valid ruleName and value
    const body = await request.json();
    const { ruleName, value } = body;

    if (!ruleName || typeof ruleName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ruleName parameter is required and must be a string.' },
        { status: 400 }
      );
    }

    const cleanName = ruleName.replace(LEGACY_GAMERULE_PREFIX, '');

    // 1. Always update local JSON as single source of truth
    await saveGameruleConfig(server, cleanName, value);

    // Default offline/unreached RCON response structure
    let rconResponse: RconCommandResult = {
      success: false,
      error: 'Server is offline or RCON connection could not be established.',
    };
    
    let isLive = false;

    // 2. If server is online, push live update via RCON
    try {
      const result = await sendRconCommand(server.rcon, `gamerule ${cleanName} ${value}`);
      rconResponse = result;
      isLive = result.success;
    } catch {
      isLive = false;
    }

    return NextResponse.json({
      success: true,
      isLive,
      ruleName: cleanName,
      value,
      rconResponse,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}