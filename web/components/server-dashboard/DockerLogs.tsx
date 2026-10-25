'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from 'cn';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PanelCard } from '@/components/shared/PanelCard';
import { useServer } from '@/components/server-dashboard/ServerProvider';
import { useApiResource } from '@/hooks/use-api-resource';

const LINE_COUNT_OPTIONS = [100, 200, 500, 1000];
const LOGS_POLL_MS = 3000;
/** Within this distance from the bottom we keep following new lines. */
const FOLLOW_THRESHOLD_PX = 50;

function getLineStyle(line: string): string {
  const upper = line.toUpperCase();
  if (upper.includes('/WARN') || upper.includes('WARNING')) return 'text-warning font-medium';
  if (upper.includes('/ERROR') || upper.includes('EXCEPTION') || upper.includes('FAILED')) {
    return 'text-destructive font-semibold';
  }
  if (upper.includes('/INFO')) return 'text-success';
  return 'text-foreground/80';
}

export function DockerLogs() {
  const { serverId } = useServer();
  const [lineCount, setLineCount] = useState(200);
  const { data, error, loading } = useApiResource<{ logs: string }>(
    `/api/servers/${serverId}/docker/logs?lines=${lineCount}`,
    { intervalMs: LOGS_POLL_MS }
  );

  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const isUserScrollingRef = useRef(false);

  const lines = useMemo(() => {
    const logLines =
      typeof data?.logs === 'string'
        ? data.logs.split(/\r?\n/).filter((line) => line.trim().length > 0)
        : [];
    return error ? [...logLines, `[ERROR] Failed to fetch Docker logs: ${error}`] : logLines;
  }, [data, error]);

  // Follow new lines unless the user scrolled up to read.
  useEffect(() => {
    const element = logContainerRef.current;
    if (element && !isUserScrollingRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [lines]);

  const handleScroll = () => {
    const element = logContainerRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    isUserScrollingRef.current = distanceFromBottom >= FOLLOW_THRESHOLD_PX;
  };

  return (
    <PanelCard
      title={
        <span className="flex items-center gap-2">
          <span className="size-2.5 animate-pulse rounded-full bg-success" />
          Docker Live Logs
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          <Label htmlFor="log-line-count" className="text-xs font-normal text-muted-foreground">
            History:
          </Label>
          <Select
            value={String(lineCount)}
            onValueChange={(next) => {
              if (next) setLineCount(Number(next));
            }}
          >
            <SelectTrigger id="log-line-count" size="sm" className="w-28">
              <SelectValue>{lineCount} lines</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LINE_COUNT_OPTIONS.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count} lines
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="h-80 space-y-1 overflow-y-auto rounded-md border bg-background p-4 font-mono text-xs select-text"
      >
        {lines.length === 0 ? (
          <div className="text-muted-foreground italic">
            {loading ? 'Loading logs...' : 'No log outputs recorded for current session...'}
          </div>
        ) : (
          lines.map((line, index) => (
            <div key={index} className={cn('leading-relaxed wrap-break-word', getLineStyle(line))}>
              {line}
            </div>
          ))
        )}
      </div>
    </PanelCard>
  );
}
