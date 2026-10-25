'use client';

import { useState } from 'react';
import { HomeHeader } from '@/components/servers/HomeHeader';
import { ServerFormDialog } from '@/components/servers/ServerFormDialog';
import { ServerGrid } from '@/components/servers/ServerGrid';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { useConfirm } from '@/hooks/use-confirm';
import { useServers } from '@/hooks/use-servers';
import { apiFetch } from '@/lib/apiClient';
import {
  fallbackCreateSeed,
  seedFromDefaults,
  seedFromServer,
  type ServerDefaults,
  type ServerFormSeed,
} from '@/lib/serverForm';
import type { ServerProfile } from '@/types/server';

/** The home page body: server list, create/edit dialog and delete confirmation. */
export function ServerManager() {
  const { servers, error: loadError, loading, reload } = useServers();
  const { confirm, confirmDialog } = useConfirm();

  const [actionError, setActionError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formSeed, setFormSeed] = useState<ServerFormSeed | null>(null);
  const [formSession, setFormSession] = useState(0);

  const openForm = (seed: ServerFormSeed) => {
    setFormSeed(seed);
    setFormSession((session) => session + 1);
    setFormOpen(true);
  };

  const handleCreate = async () => {
    const result = await apiFetch<{ defaults: ServerDefaults }>('/api/servers/template');
    openForm(result.success ? seedFromDefaults(result.defaults) : fallbackCreateSeed(servers.length));
  };

  const handleEdit = (server: ServerProfile) => openForm(seedFromServer(server));

  const handleSaved = () => {
    setFormOpen(false);
    void reload();
  };

  const handleDelete = async (server: ServerProfile) => {
    const confirmed = await confirm({
      title: `Delete "${server.name}"?`,
      description: 'This deletes the server profile and its container.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActionError(null);
    const result = await apiFetch(`/api/servers/${server.id}`, { method: 'DELETE' });
    if (result.success) await reload();
    else setActionError(`Failed to delete "${server.name}": ${result.error}`);
  };

  return (
    <>
      <HomeHeader onCreate={handleCreate} />

      <StatusBanner variant="error" className="mb-6">
        {loadError ?? actionError}
      </StatusBanner>

      <ServerGrid
        loading={loading}
        servers={servers}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ServerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        seed={formSeed}
        session={formSession}
        onSaved={handleSaved}
      />

      {confirmDialog}
    </>
  );
}
