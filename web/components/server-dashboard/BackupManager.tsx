'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/shared/PanelCard';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { useServer } from '@/components/server-dashboard/ServerProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { useConfirm } from '@/hooks/use-confirm';
import { apiFetch } from '@/lib/apiClient';
import type { StatusMessage } from '@/types/statusMessage';

export interface BackupFile {
  filename: string;
  sizeBytes: number;
  formattedSize: string;
  createdAt: string;
}

interface BackupsPayload {
  backups: BackupFile[];
  formattedTotalSize?: string;
}

export function BackupManager() {
  const { serverId, status, refreshStatus, backupsVersion } = useServer();
  const { confirm, confirmDialog } = useConfirm();

  // `backupsVersion` changes when another panel (reset, delete/recreate) touched the backups.
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useApiResource<BackupsPayload>(`/api/servers/${serverId}/backups`, {
    refreshKey: backupsVersion,
  });

  const [creating, setCreating] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  const backups = data?.backups ?? [];
  const formattedTotalSize = data?.formattedTotalSize || '0 B';
  const isServerRunning = Boolean(status?.running);

  const handleCreateBackup = async () => {
    setCreating(true);
    setMessage({ variant: 'info', text: 'Compressing world folder into backup...' });

    const result = await apiFetch(`/api/servers/${serverId}/backups`, { method: 'POST' });

    if (result.success) {
      setMessage({ variant: 'success', text: 'Backup created successfully!' });
      await reload();
    } else {
      setMessage({ variant: 'error', text: `Backup failed: ${result.error}` });
    }
    setCreating(false);
  };

  const handleRestoreBackup = async (filename: string) => {
    // Ask the server for the current state instead of trusting the last poll.
    const fresh = await refreshStatus();
    if (fresh?.running) {
      setMessage({ variant: 'error', text: 'You must stop the server before restoring a backup.' });
      return;
    }

    const confirmed = await confirm({
      title: `Restore "${filename}"?`,
      description: `This will save a safety copy of your live world, apply "${filename}", and remove the used archive.`,
      confirmLabel: 'Restore',
      variant: 'warning',
    });
    if (!confirmed) return;

    setRestoringFile(filename);
    setMessage({
      variant: 'info',
      text: `Restoring ${filename}... Creating safety snapshot and unpacking...`,
    });

    const result = await apiFetch<{ message: string }>(`/api/servers/${serverId}/backups/restore`, {
      method: 'POST',
      body: { filename },
    });

    if (result.success) {
      setMessage({ variant: 'success', text: result.message });
      await reload(); // the safety snapshot appears and the used archive disappears
    } else {
      setMessage({ variant: 'error', text: `Restore Error: ${result.error}` });
    }
    setRestoringFile(null);
  };

  const handleDeleteBackup = async (filename: string) => {
    const confirmed = await confirm({
      title: `Delete "${filename}"?`,
      description: 'This permanently deletes the backup file.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setDeletingFile(filename);
    setMessage({ variant: 'info', text: `Deleting ${filename}...` });

    const result = await apiFetch(
      `/api/servers/${serverId}/backups?filename=${encodeURIComponent(filename)}`,
      { method: 'DELETE' }
    );

    if (result.success) {
      setMessage({ variant: 'success', text: 'Backup deleted successfully.' });
      await reload();
    } else {
      setMessage({ variant: 'error', text: `Delete failed: ${result.error}` });
    }
    setDeletingFile(null);
  };

  return (
    <PanelCard
      title="World Backups"
      badge={
        <Badge variant="success" className="font-mono">
          Total Storage: {formattedTotalSize}
        </Badge>
      }
      description={
        <>
          Manual snapshots saved in{' '}
          <code className="text-success">data/servers/{serverId}/backups/</code>
        </>
      }
      actions={
        <Button onClick={handleCreateBackup} disabled={creating}>
          {creating ? 'Creating Archive...' : 'Create World Backup'}
        </Button>
      }
      loading={loading}
      loadingText="Loading backups list..."
    >
      <StatusBanner variant="error">{loadError && `Failed to load backups: ${loadError}`}</StatusBanner>
      {message && <StatusBanner variant={message.variant}>{message.text}</StatusBanner>}

      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-lg border bg-background p-2">
        {backups.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No backups found. Click &quot;Create World Backup&quot; above to make your first
            snapshot.
          </p>
        ) : (
          backups.map((backup) => (
            <div
              key={backup.filename}
              className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:border-ring/50"
            >
              <div className="flex flex-col gap-1 overflow-hidden pr-4">
                <span className="truncate font-mono text-xs font-semibold">{backup.filename}</span>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="font-mono text-success">{backup.formattedSize}</span>
                  <span>•</span>
                  <span>{new Date(backup.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => handleRestoreBackup(backup.filename)}
                  disabled={isServerRunning || restoringFile === backup.filename}
                  title={isServerRunning ? 'Stop server to restore backups' : 'Restore world'}
                >
                  {restoringFile === backup.filename ? 'Restoring...' : 'Restore'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteBackup(backup.filename)}
                  disabled={deletingFile === backup.filename}
                >
                  {deletingFile === backup.filename ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmDialog}
    </PanelCard>
  );
}
