'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useApiResource } from '@/hooks/use-api-resource';
import type { ServerStatus } from '@/types/serverStatus';

const STATUS_POLL_MS = 3000;

interface ServerContextValue {
  serverId: string;
  /** Latest Docker status, or null until the first response. */
  status: ServerStatus | null;
  statusLoading: boolean;
  /** Fetch the status right now (e.g. after start/stop). */
  refreshStatus: () => Promise<void>;
  /** Increases every time something changed the backups (restore, reset, safety backup...). */
  backupsVersion: number;
  notifyBackupsChanged: () => void;
}

const ServerContext = createContext<ServerContextValue | null>(null);

/**
 * One shared status poll for the whole server dashboard, plus a tiny
 * "backups changed" signal. Replaces the four separate pollers and the
 * `backupListUpdated` window event.
 */
export function ServerProvider({
  serverId,
  children,
}: {
  serverId: string;
  children: ReactNode;
}) {
  const {
    data: status,
    loading: statusLoading,
    reload: refreshStatus,
  } = useApiResource<ServerStatus>(`/api/servers/${serverId}/docker/status`, {
    intervalMs: STATUS_POLL_MS,
  });

  const [backupsVersion, setBackupsVersion] = useState(0);
  const notifyBackupsChanged = useCallback(() => setBackupsVersion((v) => v + 1), []);

  const value = useMemo<ServerContextValue>(
    () => ({
      serverId,
      status,
      statusLoading,
      refreshStatus,
      backupsVersion,
      notifyBackupsChanged,
    }),
    [serverId, status, statusLoading, refreshStatus, backupsVersion, notifyBackupsChanged]
  );

  return <ServerContext value={value}>{children}</ServerContext>;
}

export function useServer(): ServerContextValue {
  const context = useContext(ServerContext);
  if (!context) throw new Error('useServer must be used inside <ServerProvider>.');
  return context;
}
