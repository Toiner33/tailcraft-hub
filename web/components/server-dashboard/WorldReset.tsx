'use client';

import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/shared/PanelCard';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { useServer } from '@/components/server-dashboard/ServerProvider';
import {
  DEFAULT_WORLD_SETTINGS,
  WorldSettingsFields,
  type WorldSettings,
} from '@/components/server-dashboard/WorldSettingsFields';
import { useConfirm } from '@/hooks/use-confirm';
import { apiFetch } from '@/lib/apiClient';
import type { StatusMessage } from '@/types/statusMessage';

export function WorldReset() {
  const { serverId, status, refreshStatus, notifyBackupsChanged } = useServer();
  const { confirm, confirmDialog } = useConfirm();

  const [settings, setSettings] = useState<WorldSettings>(DEFAULT_WORLD_SETTINGS);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  const isServerRunning = Boolean(status?.running);

  const handleResetWorld = async () => {
    // Ask the server for the current state instead of trusting the last poll.
    const fresh = await refreshStatus();
    if (fresh?.running) {
      setMessage({ variant: 'error', text: 'You must stop the server before resetting the world.' });
      return;
    }

    const confirmed = await confirm({
      title: 'Reset the world?',
      description:
        'DANGER: This will wipe your current map! (A safety backup will be automatically created).',
      confirmLabel: 'Reset World',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setIsResetting(true);
    setMessage({
      variant: 'info',
      text: 'Creating safety backup and resetting world generation settings...',
    });

    const result = await apiFetch<{ message: string }>(`/api/servers/${serverId}/world/reset`, {
      method: 'POST',
      body: settings,
    });

    if (result.success) {
      setMessage({ variant: 'success', text: result.message });
      notifyBackupsChanged(); // the safety backup shows up in the backups list
    } else {
      setMessage({ variant: 'error', text: `Reset Failed: ${result.error}` });
    }
    setIsResetting(false);
  };

  return (
    <PanelCard
      title="World Generation & Reset"
      badge={
        isServerRunning && (
          <Badge variant="destructive">Server Running — Stop server to reset</Badge>
        )
      }
      description="Configure seed and generation settings before wiping and re-generating your world."
    >
      {message && <StatusBanner variant={message.variant}>{message.text}</StatusBanner>}

      <WorldSettingsFields
        value={settings}
        onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
      />

      <div className="flex justify-end pt-2">
        <Button
          variant="destructive"
          onClick={handleResetWorld}
          disabled={isServerRunning || isResetting}
          title={isServerRunning ? 'Stop server to reset world' : 'Reset world'}
        >
          <TriangleAlert data-icon="inline-start" />
          {isResetting ? 'Resetting World...' : 'Reset & Generate New World'}
        </Button>
      </div>

      {confirmDialog}
    </PanelCard>
  );
}
