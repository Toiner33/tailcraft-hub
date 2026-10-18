import { NextRequest, NextResponse } from 'next/server';
import { fetchVersionsForType } from '@/lib/serverVersions';
import { SERVER_ENGINES_MAP, ServerEngine } from '@/types/server';
import { SERVER_DEFAULTS_FALLBACKS } from '@/lib/constants';

const DEFAULT_VERSIONS = [SERVER_DEFAULTS_FALLBACKS.version];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawType = searchParams.get('type');

  // Rule 1: If parameter is missing entirely, default to PAPER
  if (!rawType) {
    try {
      let versions = await fetchVersionsForType('PAPER');
      return NextResponse.json({ success: true, type: 'PAPER', versions: versions.length ? versions : DEFAULT_VERSIONS });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message, versions: DEFAULT_VERSIONS }, { status: 400 });
    }
  }

  const engineKey = rawType.toUpperCase();

  // Rule 2: If provided but unsupported, reject with 400
  if (!(engineKey in SERVER_ENGINES_MAP)) {
    return NextResponse.json(
      { success: false, error: `Unsupported engine type: "${rawType}"`, versions: DEFAULT_VERSIONS },
      { status: 400 }
    );
  }

  const type = engineKey as ServerEngine;

  try {
    let versions = await fetchVersionsForType(type);
    
    if (!versions || versions.length === 0) {
      versions = DEFAULT_VERSIONS;
    }

    return NextResponse.json({ success: true, type, versions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, versions: DEFAULT_VERSIONS },
      { status: 400 }
    );
  }
}