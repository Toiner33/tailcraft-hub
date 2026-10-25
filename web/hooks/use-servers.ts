'use client';

import { useApiResource } from '@/hooks/use-api-resource';
import type { ServerProfile } from '@/types/server';

/** The list of server profiles (GET /api/servers). Call `reload()` after changing one. */
export function useServers() {
  const { data, error, loading, reload } = useApiResource<{ servers: ServerProfile[] }>(
    '/api/servers'
  );

  return { servers: data?.servers ?? [], error, loading, reload };
}
