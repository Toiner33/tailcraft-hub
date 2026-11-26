'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/shared/PanelCard';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { useServer } from '@/components/server-dashboard/ServerProvider';
import {
  DEFAULT_WORLD_SETTINGS,
  WorldSettingsFields,
  type WorldSettings,
} from '@/components/server-dashboard/WorldSettingsFields';
import { apiFetch } from '@/lib/apiClient';
import { DOCKER_ACTIONS } from '@/types/dockerActions';

/**
 * Shown in Overview instead of the server control card while the container does not
 * exist AND the server has no world yet. It stores the world settings first, then
 * creates and starts the container, so the world is generated with those settings.
 */
export function NewWorldSetup() {
  const { serverId, refreshStatus } = useServer();

  const [settings, setSettings] = useState<WorldSettings>(DEFAULT_WORLD_SETTINGS);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    // 1. Save the settings in server.properties (the file does not exist before the first start).
    const saved = await apiFetch(`/api/servers/${serverId}/world/reset`, {
      method: 'POST',
      body: { ...settings, setupOnly: true },
    });
    if (!saved.success) {
      setError(`Could not save the world settings: ${saved.error}`);
      setCreating(false);
      return;
    }

    // 2. Create the container and start it. The world is generated on this first start.
    const created = await apiFetch(`/api/servers/${serverId}/docker/action`, {
      method: 'POST',
      body: { action: DOCKER_ACTIONS.CREATE },
    });
    if (!created.success) {
      setError(`The settings were saved, but creating the server failed: ${created.error}`);
    }

    await refreshStatus(); // once the container exists, Overview switches to the control card
    setCreating(false);
  };

  return (
    <PanelCard
      title="Create your world"
      description="Choose how the world is generated before the server starts for the first time. To change it later, use World → World Generation & Reset (that wipes the world)."
    >
      <StatusBanner variant="error">{error}</StatusBanner>

      <WorldSettingsFields
        value={settings}
        onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
      />

      <div className="flex justify-end pt-2">
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? 'Creating...' : 'Create World & Start Server'}
        </Button>
      </div>
    </PanelCard>
  );
}
