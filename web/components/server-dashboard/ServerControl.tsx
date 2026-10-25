'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { PanelCard } from '@/components/shared/PanelCard';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { ServerActionButtons } from '@/components/server-dashboard/ServerActionButtons';
import { useServer } from '@/components/server-dashboard/ServerProvider';
import { useConfirm } from '@/hooks/use-confirm';
import { apiFetch } from '@/lib/apiClient';
import { DOCKER_ACTIONS, type DockerAction } from '@/types/dockerActions';

const SAFETY_BACKUP_CHECKBOX = {
  label: 'Create a safety backup of the world first (recommended)',
  defaultChecked: true,
};

function getBadge(loading: boolean, outOfSync: boolean, isRunning: boolean, exists: boolean) {
  if (loading) return { label: 'Checking...', variant: 'secondary' } as const;
  if (outOfSync) return { label: 'OUT OF SYNC', variant: 'warning' } as const;
  if (isRunning) return { label: 'ONLINE', variant: 'success' } as const;
  if (exists) return { label: 'STOPPED', variant: 'warning' } as const;
  return { label: 'NOT CREATED', variant: 'secondary' } as const;
}

export function ServerControl() {
  const { serverId, status, statusLoading, refreshStatus, notifyBackupsChanged } = useServer();
  const { confirmWithCheckbox, confirmDialog } = useConfirm();

  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isRunning = status?.running ?? false;
  const containerExists = status?.exists ?? false;
  const outOfSync = status?.outOfSync ?? false;
  const badge = getBadge(statusLoading, outOfSync, isRunning, containerExists);

  const postAction = (body: { action: DockerAction; createSafetyBackup?: boolean }) =>
    apiFetch<{ message: string }>(`/api/servers/${serverId}/docker/action`, {
      method: 'POST',
      body,
    });

  const handleDelete = async () => {
    const { confirmed, checked: createBackup } = await confirmWithCheckbox({
      title: 'Delete this server container?',
      description: 'The Docker container will be removed.',
      confirmLabel: 'Delete',
      variant: 'destructive',
      checkbox: SAFETY_BACKUP_CHECKBOX,
    });
    if (!confirmed) return;

    setActionPending(true);
    setActionError(null);

    const result = await postAction({ action: DOCKER_ACTIONS.DELETE, createSafetyBackup: createBackup });
    if (createBackup) notifyBackupsChanged(); // the backups list may have a new entry
    if (!result.success) setActionError(`Delete failed: ${result.error}`);

    await refreshStatus();
    setActionPending(false);
  };

  // Recreate = delete the old container, then create a new one with the updated profile.
  const handleRecreate = async () => {
    const { confirmed, checked: createBackup } = await confirmWithCheckbox({
      title: 'Recreate the container?',
      description:
        'Recreating the container applies your updated configuration parameters (RAM, version, ports).',
      confirmLabel: 'Recreate',
      variant: 'warning',
      checkbox: SAFETY_BACKUP_CHECKBOX,
    });
    if (!confirmed) return;

    setActionPending(true);
    setActionError(null);

    const deleted = await postAction({ action: DOCKER_ACTIONS.DELETE, createSafetyBackup: createBackup });
    if (createBackup) notifyBackupsChanged();

    if (!deleted.success) {
      // Stop here: do not try to create a container while the old one may still exist.
      setActionError(`Recreate stopped, the old container could not be deleted: ${deleted.error}`);
    } else {
      const created = await postAction({ action: DOCKER_ACTIONS.CREATE });
      if (!created.success) {
        setActionError(
          `The old container was deleted, but creating the new one failed: ${created.error}`
        );
      }
    }

    await refreshStatus();
    setActionPending(false);
  };

  const handleAction = async (action: DockerAction) => {
    if (action === DOCKER_ACTIONS.DELETE) {
      await handleDelete();
      return;
    }

    setActionPending(true);
    setActionError(null);

    const result = await postAction({ action });
    if (!result.success) setActionError(`Action "${action}" failed: ${result.error}`);

    await refreshStatus();
    setActionPending(false);
  };

  return (
    <PanelCard
      title={<span className="block truncate">{status?.name || 'Minecraft Server'}</span>}
      actions={<Badge variant={badge.variant}>{badge.label}</Badge>}
      loading={statusLoading}
      loadingText="Checking server status..."
    >
      <StatusBanner variant="error">{actionError}</StatusBanner>

      <div className="text-sm text-muted-foreground">
        Status: <span className="text-foreground capitalize">{status?.status || 'Unknown'}</span>
      </div>

      <ServerActionButtons
        containerExists={containerExists}
        isRunning={isRunning}
        outOfSync={outOfSync}
        actionPending={actionPending}
        onAction={handleAction}
        onRecreate={handleRecreate}
      />

      {confirmDialog}
    </PanelCard>
  );
}
