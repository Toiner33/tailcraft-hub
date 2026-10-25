'use client';

import { useApiResource } from '@/hooks/use-api-resource';
import { SERVER_DEFAULTS_FALLBACKS } from '@/lib/constants';
import type { ServerEngine } from '@/types/server';

/**
 * Available Minecraft versions for an engine. Refetches when the engine changes.
 * `versions` is empty while loading, and falls back to the default version if the
 * request fails or returns nothing.
 */
export function useMinecraftVersions(engine: ServerEngine) {
  const { data, loading } = useApiResource<{ versions: string[] }>(
    `/api/minecraft/versions?type=${engine}`
  );

  const loaded =
    data?.versions && data.versions.length > 0
      ? data.versions
      : [SERVER_DEFAULTS_FALLBACKS.version];

  return { versions: loading ? [] : loaded, loading };
}
