'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LogEntry {
  type: 'input' | 'output' | 'error';
  text: string;
}

export default function RconConsole() {
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([
    { type: 'output', text: 'TailCraft RCON Terminal Ready.' },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || loading) return;

    const currentCmd = command.trim();
    setCommand('');
    
    // Add user command to log
    setLogs((prev) => [...prev, { type: 'input', text: `> ${currentCmd}` }]);
    setLoading(true);

    try {
      const res = await fetch('/api/rcon/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: currentCmd }),
      });

      const data = await res.json();

      if (data.success) {
        setLogs((prev) => [...prev, { type: 'output', text: data.response }]);
      } else {
        setLogs((prev) => [
          ...prev,
          { type: 'error', text: `Error: ${data.error}` },
        ]);
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: 'error', text: 'Failed to communicate with RCON API.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl shadow-lg border-zinc-800 bg-zinc-900 text-zinc-100 mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
          RCON Terminal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Terminal Screen */}
        <div className="h-64 overflow-y-auto bg-black/80 rounded-md p-4 font-mono text-xs space-y-1.5 border border-zinc-800">
          {logs.map((log, index) => (
            <div
              key={index}
              className={
                log.type === 'input'
                  ? 'text-emerald-400 font-semibold'
                  : log.type === 'error'
                  ? 'text-rose-400'
                  : 'text-zinc-300'
              }
            >
              {log.text}
            </div>
          ))}
        </div>

        {/* Command Form */}
        <form onSubmit={handleSendCommand} className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            placeholder="Type command (e.g. 'list', 'time set day')..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !command.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
