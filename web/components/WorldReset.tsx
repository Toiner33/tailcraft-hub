'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WorldReset() {
  const [seed, setSeed] = useState<string>('');
  const [levelType, setLevelType] = useState<string>('minecraft:normal');
  const [difficulty, setDifficulty] = useState<string>('normal');
  const [hardcore, setHardcore] = useState<boolean>(false);
  const [generateStructures, setGenerateStructures] = useState<boolean>(true);

  const [isServerRunning, setIsServerRunning] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const fetchServerStatus = async () => {
    try {
      const res = await fetch('/api/docker/status');
      const data = await res.json();
      setIsServerRunning(Boolean(data.running));
    } catch {
      setIsServerRunning(false);
    }
  };

  useEffect(() => {
    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateSeed = () => {
    // Generate a random 64-bit safe numeric seed
    const randomSeed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
    setSeed(randomSeed);
  };

  const handleResetWorld = async () => {
    await fetchServerStatus();
    if (isServerRunning) {
      setStatusMessage('Error: You must stop the server before resetting the world.');
      return;
    }

    const confirmed = window.confirm(
      'DANGER: Are you sure you want to reset the world? This will wipe your current map! (A safety backup will be automatically created).'
    );
    if (!confirmed) return;

    try {
      setIsResetting(true);
      setStatusMessage('Creating safety backup and resetting world generation settings...');

      const res = await fetch('/api/world/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed,
          levelType,
          difficulty,
          hardcore,
          generateStructures,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStatusMessage(data.message);
        // Notify other components that backups have changed!
        window.dispatchEvent(new Event('backupListUpdated'));
      } else {
        setStatusMessage(`Reset Failed: ${data.error}`);
      }
    } catch {
      setStatusMessage('Failed to reset world.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="w-full border-zinc-800 bg-zinc-900 text-zinc-100 p-2 shadow-md my-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          <span>World Generation & Reset</span>
          {isServerRunning && (
            <span className="text-xs bg-rose-950/80 text-rose-400 border border-rose-800/60 px-2 py-0.5 rounded font-normal">
              Server Running — Stop server to reset
            </span>
          )}
        </CardTitle>
        <p className="text-xs text-zinc-400">
          Configure seed and generation settings before wiping and re-generating your world.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {statusMessage && (
          <div className="p-3 text-xs rounded bg-zinc-800 border border-zinc-700 text-emerald-300">
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/40 p-4 border border-zinc-800 rounded">
          {/* Seed Input & Generator */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-zinc-300">World Seed</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Leave blank for random or enter custom seed"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleGenerateSeed}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded border border-zinc-700 transition-colors"
              >
                🎲 Randomize
              </button>
            </div>
          </div>

          {/* Level Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300">World Type</label>
            <select
              value={levelType}
              onChange={(e) => setLevelType(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="minecraft:normal">Default (Normal)</option>
              <option value="minecraft:flat">Superflat</option>
              <option value="minecraft:large_biomes">Large Biomes</option>
              <option value="minecraft:amplified">Amplified</option>
              <option value="minecraft:single_biome_surface">Single Biome</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="peaceful">Peaceful</option>
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Hardcore Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded border border-zinc-800">
            <div>
              <p className="text-xs font-semibold text-zinc-200">Hardcore Mode</p>
              <p className="text-[11px] text-zinc-400">Permadeath & Hard difficulty lock</p>
            </div>
            <input
              type="checkbox"
              checked={hardcore}
              onChange={(e) => setHardcore(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-500"
            />
          </div>

          {/* Generate Structures Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded border border-zinc-800">
            <div>
              <p className="text-xs font-semibold text-zinc-200">Generate Structures</p>
              <p className="text-[11px] text-zinc-400">Villages, temples, strongholds</p>
            </div>
            <input
              type="checkbox"
              checked={generateStructures}
              onChange={(e) => setGenerateStructures(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleResetWorld}
            disabled={isServerRunning || isResetting}
            title={isServerRunning ? 'Stop server to reset world' : 'Reset world'}
            className="bg-rose-900/80 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-rose-100 font-medium text-xs px-5 py-2.5 rounded transition-colors border border-rose-700"
          >
            {isResetting ? 'Resetting World...' : '⚠️ Reset & Generate New World'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}