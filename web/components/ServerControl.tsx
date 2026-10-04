'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

  const handleAction = async (action: 'create' | 'start' | 'stop' | 'restart') => {
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

        <div className="flex gap-2 pt-2">
          {!containerExists ? (
            <Button
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
              disabled={actionPending}
              onClick={() => handleAction('create')}
            >
              Create Server
            </Button>
          ) : !isRunning ? (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500"
              disabled={actionPending}
              onClick={() => handleAction('start')}
            >
              Start Server
            </Button>
          ) : (
            <>
              <Button
                variant="destructive"
                className="w-full"
                disabled={actionPending}
                onClick={() => handleAction('stop')}
              >
                Stop Server
              </Button>
              <Button
                variant="outline"
                className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-100"
                disabled={actionPending}
                onClick={() => handleAction('restart')}
              >
                Restart
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}