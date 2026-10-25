'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PanelCard } from '@/components/shared/PanelCard';
import { useServer } from '@/components/server-dashboard/ServerProvider';
import { apiFetch } from '@/lib/apiClient';

interface LogEntry {
  type: 'input' | 'output' | 'error';
  text: string;
}

/**
 * The RCON route nests the library result, so `response` can be an object like
 * { success, response, error? } instead of a plain string. Accept both shapes.
 */
function parseRconReply(value: unknown): { ok: boolean; text: string } {
  if (typeof value === 'string') return { ok: true, text: value };

  if (typeof value === 'object' && value !== null) {
    const reply = value as { success?: boolean; response?: unknown; error?: unknown };
    const text = typeof reply.response === 'string' ? reply.response : '';
    if (reply.success === false) {
      const error = typeof reply.error === 'string' ? reply.error : text;
      return { ok: false, text: error || 'RCON command failed.' };
    }
    return { ok: true, text };
  }

  return { ok: true, text: '' };
}

const LINE_STYLE: Record<LogEntry['type'], string> = {
  input: 'text-success font-semibold',
  output: 'text-foreground/80',
  error: 'text-destructive',
};

export function RconConsole() {
  const { serverId } = useServer();
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([
    { type: 'output', text: 'TailCraft RCON Terminal Ready.' },
  ]);
  const [sending, setSending] = useState(false);
  const screenRef = useRef<HTMLDivElement | null>(null);

  // Always show the newest line.
  useEffect(() => {
    const element = screenRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [logs]);

  const addLog = (entry: LogEntry) => setLogs((prev) => [...prev, entry]);

  const handleSendCommand = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentCommand = command.trim();
    if (!currentCommand || sending) return;

    setCommand('');
    addLog({ type: 'input', text: `> ${currentCommand}` });
    setSending(true);

    const result = await apiFetch<{ response: unknown }>(`/api/servers/${serverId}/rcon/command`, {
      method: 'POST',
      body: { command: currentCommand },
    });

    if (result.success) {
      const reply = parseRconReply(result.response);
      addLog(
        reply.ok
          ? { type: 'output', text: reply.text || '(command sent, no output)' }
          : { type: 'error', text: `Error: ${reply.text}` }
      );
    } else {
      addLog({ type: 'error', text: `Error: ${result.error}` });
    }
    setSending(false);
  };

  return (
    <PanelCard
      title={
        <span className="flex items-center gap-2">
          <span className="size-3 animate-pulse rounded-full bg-success" />
          RCON Terminal
        </span>
      }
    >
      <div
        ref={screenRef}
        className="h-64 space-y-1.5 overflow-y-auto rounded-md border bg-background p-4 font-mono text-xs"
      >
        {logs.map((log, index) => (
          <div key={index} className={cn(LINE_STYLE[log.type])}>
            {log.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleSendCommand} className="flex gap-2">
        <Input
          type="text"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 font-mono"
          placeholder="Type command (e.g. 'list', 'time set day')..."
          aria-label="RCON command"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !command.trim()}>
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </form>
    </PanelCard>
  );
}
