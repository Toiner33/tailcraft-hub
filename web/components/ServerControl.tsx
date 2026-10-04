'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DOCKER_ACTIONS, DockerAction } from '@/types/dockerActions';

// ==========================================
// 1. SUB-COMPONENT: ServerActionButtons to handle the correct button rendering based on server state
// ==========================================
interface ServerActionButtonsProps {
  containerExists: boolean;
  isRunning: boolean;
  actionPending: boolean;
  onAction: (action: DockerAction) => void;
}

function ServerActionButtons({
  containerExists,
  isRunning,
  actionPending,
  onAction,
}: ServerActionButtonsProps) {
  if (!containerExists) {
    return (
      <Button
        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
        disabled={actionPending}
        onClick={() => onAction(DOCKER_ACTIONS.CREATE)}
      >
        Create Server
      </Button>
    );
  }

  if (!isRunning) {
    return (
      <div className="flex gap-2">
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-500"
          disabled={actionPending}
          onClick={() => onAction(DOCKER_ACTIONS.START)}
        >
          Start
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
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
        disabled={actionPending}
        onClick={() => onAction(DOCKER_ACTIONS.STOP)}
      >
        Stop
      </Button>
      <Button
        variant="outline"
        className="border-zinc-700 hover:bg-zinc-800 text-zinc-100"
        disabled={actionPending}
        onClick={() => onAction(DOCKER_ACTIONS.RESTART)}
      >
        Restart
      </Button>
      <Button
        variant="destructive"
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

  const handleAction = async (action: DockerAction) => {
    if (action === DOCKER_ACTIONS.DELETE && !window.confirm('Are you sure you want to delete this server container?')) {
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

  const isRunning = statusData?.running ?? false;
  const containerExists = statusData?.exists ?? false;

  return (
    <Card className="w-full max-w-md shadow-lg border-zinc-800 bg-zinc-900 text-zinc-100">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">
          {statusData?.name || 'Minecraft Server'}
        </CardTitle>
        <Badge
          className={
            isRunning
              ? 'bg-emerald-600 hover:bg-emerald-500'
              : containerExists
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-zinc-600 hover:bg-zinc-500'
          }
        >
          {loading ? 'Checking...' : isRunning ? 'ONLINE' : containerExists ? 'STOPPED' : 'NOT CREATED'}
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
            actionPending={actionPending}
            onAction={handleAction}
          />
        </div>
      </CardContent>
    </Card>
  );
}