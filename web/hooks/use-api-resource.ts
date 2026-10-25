'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, type ApiResult } from '@/lib/apiClient';

interface UseApiResourceOptions {
  /** Re-fetch every N milliseconds. Leave undefined to fetch once. */
  intervalMs?: number;
  /** Set to false to pause fetching and polling (e.g. a hidden tab). Default: true. */
  enabled?: boolean;
  /** Change this value to force a re-fetch, like a cache key. */
  refreshKey?: number | string;
}

interface Snapshot<T> {
  /** The URL this data belongs to, so data from a previous URL is never shown. */
  url: string;
  data: T | null;
  error: string | null;
}

function mergeResult<T extends object>(
  prev: Snapshot<T> | null,
  url: string,
  result: ApiResult<T>
): Snapshot<T> {
  if (result.success) return { url, data: result, error: null };
  // On a failed refresh keep showing the last good data, plus the error.
  return { url, data: prev && prev.url === url ? prev.data : null, error: result.error };
}

/**
 * GETs an API route and keeps the result in state, optionally polling.
 *
 * - `loading` is true only until the first response (it does NOT flip back on
 *   later refreshes, so panels do not flash their loading state).
 * - `error` is set when the latest request failed; `data` keeps the last good value.
 * - `reload()` fetches now, e.g. after a POST that changed the data.
 * - Polling skips ticks while the browser tab is hidden.
 */
export function useApiResource<T extends object>(
  url: string,
  options: UseApiResourceOptions = {}
) {
  const { intervalMs, enabled = true, refreshKey } = options;
  const [snapshot, setSnapshot] = useState<Snapshot<T> | null>(null);
  const latestUrlRef = useRef(url);

  useEffect(() => {
    latestUrlRef.current = url;
    if (!enabled) return;

    let cancelled = false;

    // setState happens inside the .then callback, not synchronously in the effect.
    const fetchNow = () => {
      apiFetch<T>(url).then((result) => {
        if (cancelled) return;
        setSnapshot((prev) => mergeResult(prev, url, result));
      });
    };

    fetchNow();

    const intervalId = intervalMs
      ? setInterval(() => {
          if (document.visibilityState === 'visible') fetchNow();
        }, intervalMs)
      : undefined;

    return () => {
      cancelled = true;
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [url, enabled, intervalMs, refreshKey]);

  const reload = useCallback(async () => {
    const result = await apiFetch<T>(url);
    if (latestUrlRef.current !== url) return; // URL changed while waiting
    setSnapshot((prev) => mergeResult(prev, url, result));
  }, [url]);

  const current = snapshot && snapshot.url === url ? snapshot : null;

  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: current === null,
    reload,
  };
}
