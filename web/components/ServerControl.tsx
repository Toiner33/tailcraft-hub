'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DOCKER_ACTIONS, DockerAction } from '@/types/dockerActions';

// ==========================================
// 1. SUB-COMPONENT: ServerActionButtons
// ==========================================
interface ServerActionButtonsProps {
  containerExists: boolean;
  isRunning: boolean;
  outOfSync: boolean;
  actionPending: boolean;
  onAction: (action: DockerAction) => void;
  onRecreate: () => void;
}

function ServerActionButtons({
  containerExists,
  isRunning,
  outOfSync,
  actionPending,
  onAction,
  onRecreate,
}: ServerActionButtonsProps) {
  if (!containerExists) {
    return (
      <Button
        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
        disabled={actionPending}
        onClick={() => onAction(DOCKER_ACTIONS.CREATE)}
      >
        Create Server
      </Button>
    );
  }

  // If configuration was updated in JSON after container creation, prompt user to Recreate/Sync
  if (outOfSync) {
    return (
      <div className="space-y-2">
        <div className="p-2.5 text-xs rounded bg-amber-950/50 border border-amber-800 text-amber-300 text-center">
          ⚠️ Server parameters have changed. Recreate container to apply updates.
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
            disabled={actionPending}
            onClick={onRecreate}
          >
            Recreate Container
          </Button>
          <Button
            variant="destructive"
            className="text-xs px-3"
            disabled={actionPending}
            onClick={() => onAction(DOCKER_ACTIONS.DELETE)}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  }

  if (!isRunning) {
    return (
      <div className="flex gap-2">
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs"
          disabled={actionPending}
          onClick={() => onAction(DOCKER_ACTIONS.START)}
        >
          Start
        </Button>
        <Button
          variant="destructive"
          className="flex-1 text-xs"
          disabled={actionPending}
          onClick={() => onAction(DOCKER_ACTIONS.DELETE)}
        >
          Delete
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        variant="destructive"
        className="text-xs"
        disabled={actionPending}
        onClick={() => onAction(DOCKER_ACTIONS.STOP)}
      >
        Stop
      </Button>
      <Button
        className="border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium"
        disabled={actionPending}
        onClick={() => onAction(DOCKER_ACTIONS.RESTART)}
      >
        Restart
      </Button>
      <Button
        variant="destructive"
        className="text-xs"
        disabled={actionPending}
        onClick={() => onAction(DOCKER_ACTIONS.DELETE)}
      >
        Delete
      </Button>
    </div>
  );
}

interface ServerStatus {
  success: boolean;
  status: string;
  running: boolean;
  exists?: boolean;
  outOfSync?: boolean;
  startedAt?: string;
  name?: string;
}

interface ServerControlProps {
  serverId: string;
}

export default function ServerControl({ serverId }: ServerControlProps) {
  const [statusData, setStatusData] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionPending, setActionPending] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/servers/${serverId}/docker/status`);
      const data = await res.json();
      setStatusData(data);
    } catch (err) {
      console.error('Error fetching server status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [serverId]);

  // Extracted helper for container deletion with optional safety backup
  const handleDelete = async () => {
    const shouldDelete = window.confirm('Are you sure you want to delete this server container?');
    if (!shouldDelete) {
      return;
    }

    const createBackup = window.confirm(
      'Would you like to create a safety backup of your world before deleting the container? (Recommended)'
    );

    setActionPending(true);
    try {
      await fetch(`/api/servers/${serverId}/docker/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: DOCKER_ACTIONS.DELETE, createSafetyBackup: createBackup }),
      });

      if (createBackup) {
        // Notify BackupManager component to refresh its list
        window.dispatchEvent(new Event('backupListUpdated'));
      }

      await fetchStatus();
    } catch (err) {
      console.error('Failed to execute delete:', err);
    } finally {
      setActionPending(false);
    }
  };

  const handleAction = async (action: DockerAction) => {
    if (action === DOCKER_ACTIONS.DELETE) {
      await handleDelete();
      return;
    }

    setActionPending(true);
    try {
      await fetch(`/api/servers/${serverId}/docker/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await fetchStatus();
    } catch (err) {
      console.error(`Failed to execute ${action}:`, err);
    } finally {
      setActionPending(false);
    }
  };

  // Recreate handler: prompts user to recreate and optionally take a safety backup
  const handleRecreate = async () => {
    const shouldRecreate = window.confirm(
      'Recreating the container will apply your updated configuration parameters (RAM, version, ports). Continue?'
    );
    if (!shouldRecreate) {
      return;
    }

    const createBackup = window.confirm(
      'Would you like to create a safety backup of your world before recreating? (Recommended)'
    );

    setActionPending(true);
    try {
      // 1. Delete old container with safety backup option based on user choice
      await fetch(`/api/servers/${serverId}/docker/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: DOCKER_ACTIONS.DELETE, createSafetyBackup: createBackup }),
      });

      if (createBackup) {
        // Notify BackupManager component to refresh its list
        window.dispatchEvent(new Event('backupListUpdated'));
      }

      // 2. Create new container with updated parameters
      await fetch(`/api/servers/${serverId}/docker/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: DOCKER_ACTIONS.CREATE }),
      });

      await fetchStatus();
    } catch (err) {
      console.error('Failed to recreate container:', err);
    } finally {
      setActionPending(false);
    }
  };

  const isRunning = statusData?.running ?? false;
  const containerExists = statusData?.exists ?? false;
  const outOfSync = statusData?.outOfSync ?? false;

  return (
    <Card className="w-full max-w-md shadow-lg border-zinc-800 bg-zinc-900 text-zinc-100">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold truncate">
          {statusData?.name || 'Minecraft Server'}
        </CardTitle>
        <Badge
          className={
            outOfSync
              ? 'bg-amber-600 hover:bg-amber-500'
              : isRunning
              ? 'bg-emerald-600 hover:bg-emerald-500'
              : containerExists
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-zinc-600 hover:bg-zinc-500'
          }
        >
          {loading ? 'Checking...' : outOfSync ? 'OUT OF SYNC' : isRunning ? 'ONLINE' : containerExists ? 'STOPPED' : 'NOT CREATED'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-zinc-400">
          Status: <span className="text-zinc-200 capitalize">{statusData?.status || 'Unknown'}</span>
        </div>

        <div className="pt-2">
          <ServerActionButtons
            containerExists={containerExists}
            isRunning={isRunning}
            outOfSync={outOfSync}
            actionPending={actionPending}
            onAction={handleAction}
            onRecreate={handleRecreate}
          />
        </div>
      </CardContent>
    </Card>
  );
}