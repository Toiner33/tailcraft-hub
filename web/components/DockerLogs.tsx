'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DockerLogs() {
  const [logLines, setLogLines] = useState<string[]>([]);
  const [lineCount, setLineCount] = useState<number>(200);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const isUserScrollingRef = useRef<boolean>(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/docker/logs?lines=${lineCount}`);
      const data = await res.json();
      if (data.success && typeof data.logs === 'string') {
        // Split raw logs cleanly into individual lines
        const lines = data.logs
          .split(/\r?\n/)
          .filter((line: string) => line.trim().length > 0);
        setLogLines(lines);
      }
    } catch (err) {
      setLogLines(['[ERROR] Failed to fetch Docker logs.']);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [lineCount]);

  useEffect(() => {
    const el = logContainerRef.current;
    if (el && !isUserScrollingRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logLines]);

  const handleScroll = () => {
    const el = logContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    isUserScrollingRef.current = !isAtBottom;
  };

  // Helper to apply log level styling
  const getLineStyle = (line: string) => {
    const upper = line.toUpperCase();
    if (upper.includes('/WARN') || upper.includes('WARNING')) {
      return 'text-amber-400 font-medium';
    }
    if (upper.includes('/ERROR') || upper.includes('EXCEPTION') || upper.includes('FAILED')) {
      return 'text-rose-400 font-semibold';
    }
    if (upper.includes('/INFO')) {
      return 'text-emerald-400';
    }
    return 'text-zinc-300';
  };

  return (
    <Card className="w-full max-w-2xl shadow-lg border-zinc-800 bg-zinc-900 text-zinc-100 mt-6">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Docker Live Logs
        </CardTitle>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <label htmlFor="lineCount">History:</label>
          <select
            id="lineCount"
            value={lineCount}
            onChange={(e) => setLineCount(Number(e.target.value))}
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none"
          >
            <option value={100}>100 lines</option>
            <option value={200}>200 lines</option>
            <option value={500}>500 lines</option>
            <option value={1000}>1000 lines</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        <div
          ref={logContainerRef}
          onScroll={handleScroll}
          className="h-80 overflow-y-auto bg-black/90 rounded-md p-4 font-mono text-xs border border-zinc-800 space-y-1 select-text"
        >
          {logLines.length === 0 ? (
            <div className="text-zinc-500 italic">No log outputs recorded yet...</div>
          ) : (
            logLines.map((line, index) => (
              <div key={index} className={`leading-relaxed break-words ${getLineStyle(line)}`}>
                {line}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
