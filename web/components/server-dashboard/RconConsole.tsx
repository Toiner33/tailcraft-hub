'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PanelCard } from '@/components/shared/PanelCard';
import { apiFetch } from '@/lib/apiClient';

interface LogEntry {
  type: 'input' | 'output' | 'error';
  text: string;
}

const LINE_STYLE: Record<LogEntry['type'], string> = {
  input: 'text-success font-semibold',
  output: 'text-foreground/80',
  error: 'text-destructive',
};

interface RconConsoleProps {
  serverId: string;
}

export function RconConsole({ serverId }: RconConsoleProps) {
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

    const result = await apiFetch<{ response: string }>(`/api/servers/${serverId}/rcon/command`, {
      method: 'POST',
      body: { command: currentCommand },
    });

    addLog(
      result.success
        ? { type: 'output', text: result.response }
        : { type: 'error', text: `Error: ${result.error}` }
    );
    setSending(false);
  };

  return (
    <PanelCard
      className="max-w-2xl"
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
