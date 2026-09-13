import { NextRequest, NextResponse } from 'next/server';
import { sendRconCommand, sendRconBatch } from '@/lib/rcon';
import { GAMERULES } from '@/types/gamerules';

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
  let isLive = false;

  try {
    // Send ALL 23 rule queries down a SINGLE RCON TCP connection
    const commands = GAMERULES.map((rule) => `gamerule ${rule.name}`);
    const rawResponses = await sendRconBatch(commands);
    isLive = true;

    GAMERULES.forEach((rule, index) => {
      const resp = rawResponses[index] || '';
      const parsed = parseValue(resp, rule.type);
      results[rule.name] = parsed !== null ? parsed : rule.defaultValue;
    });
  } catch (error) {
    console.error('RCON fetch failed:', error);
    isLive = false;
    for (const rule of GAMERULES) {
      results[rule.name] = rule.defaultValue;
    }
  }

  return NextResponse.json({
    success: true,
    isLive,
    gamerules: results,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ruleName, value } = body;

    const rconResponse = await sendRconCommand(`gamerule ${ruleName} ${value}`);

    return NextResponse.json({
      success: true,
      ruleName,
      value,
      rconResponse,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}