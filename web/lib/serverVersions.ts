import { SERVER_ENGINES_MAP, ServerEngine } from '@/types/server';
import { SERVER_DEFAULTS_FALLBACKS } from '@/lib/constants';

// Type definition for cached entry
interface CachedVersions {
  timestamp: number;
  versions: string[];
}

// In-memory cache to prevent rate limits (1 hour TTL (Time To Live))
const versionCache: Partial<Record<ServerEngine, CachedVersions>> = {};
const CACHE_TTL_MS = 1000 * 60 * 60;
const CACHE_REVALIDATE_SECONDS = 3600; // 1 hour

export async function fetchVersionsForType(engine: ServerEngine): Promise<string[]> {
  const engineProps = SERVER_ENGINES_MAP[engine];
  if (!engineProps || !engineProps.versionUrl) {
    return [];
  }

  // Check cache hit
  const cached = versionCache[engine];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.versions;
  }

  const response = await fetch(engineProps.versionUrl, {
    next: { revalidate: CACHE_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch upstream versions for ${engine} (Status: ${response.status})`);
  }

  const rawData = await response.json();
  const versions = parseVersions(rawData, engine);

  // Store in cache
  versionCache[engine] = { timestamp: Date.now(), versions };
  return versions;
}

function parseVersions(data: any, engine: ServerEngine): string[] {
  switch (engine) {
    case 'PAPER':
      return parsePaperVersions(data);
    case 'VANILLA':
    case 'SPIGOT':
        // SPIGOT builds on top of VANILLA versions, so the version list is the same for both.
      return parseMojangVersions(data);
    case 'FABRIC':
      return parseFabricVersions(data);
    case 'PURPUR':
      return parsePurpurVersions(data);
    case 'FORGE':
      return parseForgeVersions(data);
    default:
      return [SERVER_DEFAULTS_FALLBACKS.version];
  }
}

// --- Dedicated Helper Parsers ---

function parsePaperVersions(data: any): string[] {
  if (!data.versions || typeof data.versions !== 'object') return [];
  const allVersions: string[] = [];
  for (const versionArray of Object.values(data.versions)) {
    if (Array.isArray(versionArray)) {
      allVersions.push(...versionArray);
    }
  }
  return Array.from(new Set(allVersions));
}

function parseMojangVersions(data: any): string[] {
  if (!data.versions || !Array.isArray(data.versions)) return [];
  return data.versions
    .filter((v: { type: string }) => v.type === 'release')
    .map((v: { id: string }) => v.id);
}

function parseFabricVersions(data: any): string[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((v: { stable: boolean }) => v.stable)
    .map((v: { version: string }) => v.version);
}

function parsePurpurVersions(data: any): string[] {
  if (!data.versions || !Array.isArray(data.versions)) return [];
  return [...data.versions].reverse();
}

function parseForgeVersions(data: any): string[] {
  if (!data.promos || typeof data.promos !== 'object') return [];
  const mcVersions = new Set<string>();
  for (const key of Object.keys(data.promos)) {
    const parts = key.split('-');
    if (parts.length > 1) {
      parts.pop(); // remove suffix like "-latest" or "-recommended"
      const mcVersion = parts.join('-');
      if (mcVersion) mcVersions.add(mcVersion);
    }
  }
  return Array.from(mcVersions).reverse();
}