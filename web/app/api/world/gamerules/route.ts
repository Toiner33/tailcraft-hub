import { NextRequest, NextResponse } from 'next/server';
import { sendRconBatch, sendRconCommand } from '@/lib/rcon';
import { GAMERULES } from '@/types/gamerules';
import { readGameruleConfig, saveGameruleConfig } from '@/lib/gameruleConfig';

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

export async function GET() {
  const results: Record<string, boolean | number> = {};
  const savedConfig = await readGameruleConfig();
  let isLive = false;

  try {
    // Attempt live RCON status fetch
    const commands = GAMERULES.map((rule) => `gamerule ${rule.name}`);
    const rawResponses = await sendRconBatch(commands);
    isLive = true;

    GAMERULES.forEach((rule, index) => {
      const resp = rawResponses[index] || '';
      const parsed = parseValue(resp, rule.type);
      const cleanName = rule.name.replace('minecraft:', '');

      results[rule.name] = parsed ?? savedConfig[cleanName] ?? rule.defaultValue;
    });
  } catch {
    // Fallback: Read from local JSON config when offline
    isLive = false;
    for (const rule of GAMERULES) {
      const cleanName = rule.name.replace('minecraft:', '');
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ruleName, value } = body;
    const cleanName = ruleName.replace('minecraft:', '');

    // 1. Always update local JSON as single source of truth
    await saveGameruleConfig(cleanName, value);

    let rconResponse = 'Saved to local JSON configuration.';
    let isLive = false;

    // 2. If server is online, push live update via RCON
    try {
      rconResponse = await sendRconCommand(`gamerule ${cleanName} ${value}`);
      isLive = true;
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