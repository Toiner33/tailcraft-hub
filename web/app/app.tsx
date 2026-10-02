'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ServerProfile, ServerEngine, SERVER_ENGINES } from '@/types/server';
import { createServerId, createRconPassword } from '@/lib/serverRegistry';
import { APP_CONFIG } from '@/lib/config';

// ==========================================
// 1. SUB-COMPONENT: Server Grid / List View
// ==========================================
function ServerGrid({
  loading,
  servers,
  onOpenCreate,
}: {
  loading: boolean;
  servers: ServerProfile[];
  onOpenCreate: () => void;
}) {
  if (loading) {
    return (
      <div className="text-zinc-500 text-xs italic py-12 text-center">
        Loading server configurations...
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div
        onClick={onOpenCreate}
        className="border border-dashed border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 hover:bg-zinc-900/80 rounded-xl p-12 text-center space-y-3 cursor-pointer transition-all group"
      >
        <div className="h-10 w-10 mx-auto rounded-full bg-zinc-800 group-hover:bg-emerald-950 group-hover:text-emerald-400 flex items-center justify-center text-zinc-400 text-xl font-bold transition-colors">
          +
        </div>
        <h3 className="text-base font-semibold text-zinc-300">No servers configured yet</h3>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          Click here or on &quot;Create New Server&quot; to deploy your first isolated Minecraft instance.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {servers.map((server) => (
        <Card
          key={server.id}
          className="border-zinc-800 bg-zinc-900 shadow-lg hover:border-zinc-700 transition-all flex flex-col justify-between"
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center justify-between gap-2">
              <span className="truncate">{server.name}</span>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded font-mono shrink-0">
                {server.engine}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-zinc-400 space-y-1 font-mono">
              <p>
                ID: <span className="text-zinc-200">{server.id}</span>
              </p>
              <p>
                Version: <span className="text-zinc-200">{server.version}</span>
              </p>
              <p>
                Port: <span className="text-zinc-200">{server.gamePort}</span>
              </p>
              <p>
                RAM: <span className="text-zinc-200">{server.memoryMB} MB</span>
              </p>
            </div>
            <Link href={`/servers/${server.id}`} className="block w-full">
              <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium border border-zinc-700">
                Manage Server →
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ==========================================
// 2. SUB-COMPONENT: Create Server Modal
// ==========================================
interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
  formError: string;
  submitting: boolean;
  serverId: string;
  name: string;
  setName: (v: string) => void;
  engine: ServerEngine;
  setEngine: (v: ServerEngine) => void;
  version: string;
  setVersion: (v: string) => void;
  memoryMB: number;
  setMemoryMB: (v: number) => void;
  showAdvancedPorts: boolean;
  setShowAdvancedPorts: (v: boolean) => void;
  gamePort: string;
  setGamePort: (v: string) => void;
  rconPort: string;
  setRconPort: (v: string) => void;
  rconPassword: string;
  setRconPassword: (v: string) => void;
  suggestedGamePort: number;
  suggestedRconPort: number;
  suggestedRconPass: string;
}

function CreateServerModal({
  isOpen,
  onClose,
  onSubmit,
  formError,
  submitting,
  serverId,
  name,
  setName,
  engine,
  setEngine,
  version,
  setVersion,
  memoryMB,
  setMemoryMB,
  showAdvancedPorts,
  setShowAdvancedPorts,
  gamePort,
  setGamePort,
  rconPort,
  setRconPort,
  rconPassword,
  setRconPassword,
  suggestedGamePort,
  suggestedRconPort,
  suggestedRconPass,
}: CreateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
          <CardTitle className="text-lg font-bold">Deploy New Minecraft Server</CardTitle>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 text-sm font-mono">
            ✕
          </button>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={onSubmit} className="space-y-4">
            {formError && (
              <div className="p-2.5 text-xs rounded bg-rose-950/50 border border-rose-800 text-rose-300">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Server ID (Auto-assigned)</label>
              <input
                type="text"
                disabled
                value={serverId}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Server Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Engine</label>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value as ServerEngine)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                >
                  {SERVER_ENGINES.map((eng) => (
                    <option key={eng.value} value={eng.value}>
                      {eng.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Minecraft Version</label>
                <input
                  type="text"
                  required
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Allocated RAM (MB)</label>
              <input
                type="number"
                required
                step={512}
                min={1024}
                value={memoryMB}
                onChange={(e) => setMemoryMB(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Advanced Manual Port Toggle & Inputs */}
            <div className="pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowAdvancedPorts(!showAdvancedPorts)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5"
              >
                <span>{showAdvancedPorts ? '▾' : '▸'}</span>
                <span>Advanced: Manual Port & RCON Configuration</span>
              </button>

              {showAdvancedPorts && (
                <div className="mt-3 space-y-3 p-3 rounded bg-zinc-950/60 border border-zinc-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-500 font-mono">
                        Game Port (Auto: {suggestedGamePort})
                      </label>
                      <input
                        type="number"
                        placeholder={String(suggestedGamePort)}
                        value={gamePort}
                        onChange={(e) => setGamePort(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-400 focus:text-zinc-100 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-500 font-mono">
                        RCON Port (Auto: {suggestedRconPort})
                      </label>
                      <input
                        type="number"
                        placeholder={String(suggestedRconPort)}
                        value={rconPort}
                        onChange={(e) => setRconPort(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-400 focus:text-zinc-100 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500 font-mono">
                      RCON Password (Auto-generated)
                    </label>
                    <input
                      type="text"
                      placeholder={suggestedRconPass}
                      value={rconPassword}
                      onChange={(e) => setRconPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-400 focus:text-zinc-100 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                {submitting ? 'Deploying...' : 'Create Server'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// 3. MAIN COMPONENT: Home Page
// ==========================================
export default function Home() {
  const [servers, setServers] = useState<ServerProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Form Inputs
  const [serverId, setServerId] = useState<string>(createServerId());
  const [name, setName] = useState<string>('');
  const [engine, setEngine] = useState<ServerEngine>(APP_CONFIG.defaults.engine);
  const [version, setVersion] = useState<string>(APP_CONFIG.defaults.version);
  const [memoryMB, setMemoryMB] = useState<number>(APP_CONFIG.defaults.memoryMB);

  // Advanced Manual Port Controls
  const [showAdvancedPorts, setShowAdvancedPorts] = useState<boolean>(false);
  const [gamePort, setGamePort] = useState<string>('');
  const [rconPort, setRconPort] = useState<string>('');
  const [rconPassword, setRconPassword] = useState<string>('');

  // Placeholders for auto-assigned previews
  const [suggestedGamePort, setSuggestedGamePort] = useState<number>(APP_CONFIG.defaults.gamePort);
  const [suggestedRconPort, setSuggestedRconPort] = useState<number>(APP_CONFIG.defaults.rconPort);
  const [suggestedRconPass, setSuggestedRconPass] = useState<string>(createRconPassword());

  const fetchServers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/servers');
      const data = await res.json();
      if (data.success) {
        setServers(data.servers);
      } else {
        setErrorMsg(data.error || 'Failed to load servers.');
      }
    } catch {
      setErrorMsg('Network error while fetching servers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const openCreateModal = async () => {
    setFormError('');
    try {
      const res = await fetch('/api/servers/template');
      const data = await res.json();
      if (data.success) {
        const d = data.defaults;
        setServerId(d.id);
        setName(d.name);
        setEngine(d.engine);
        setVersion(d.version);
        setMemoryMB(d.memoryMB);
        setSuggestedGamePort(d.gamePort);
        setSuggestedRconPort(d.rconPort);
        setSuggestedRconPass(d.rconPassword);
      }
    } catch {
      setServerId(createServerId());
      setName(`Server ${servers.length + 1}`);
      setEngine(APP_CONFIG.defaults.engine);
      setVersion(APP_CONFIG.defaults.version);
      setMemoryMB(APP_CONFIG.defaults.memoryMB);
    }
    setIsModalOpen(true);
  };

  const handleCreateServer = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload: any = {
        name: name.trim() || undefined,
        engine,
        version: version.trim() || undefined,
        memoryMB: Number(memoryMB) || undefined,
      };

      if (showAdvancedPorts) {
        if (gamePort) payload.gamePort = parseInt(gamePort, 10);
        if (rconPort) payload.rconPort = parseInt(rconPort, 10);
        if (rconPassword.trim()) payload.rconPassword = rconPassword.trim();
      }

      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        setShowAdvancedPorts(false);
        setGamePort('');
        setRconPort('');
        setRconPassword('');
        await fetchServers();
      } else {
        setFormError(data.error || 'Failed to create server.');
      }
    } catch {
      setFormError('Network error while creating server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="w-full max-w-5xl mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">TailCraft Hub</h1>
          <p className="text-zinc-400 text-sm">Multi-Tenant Local Minecraft Server Manager</p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md"
        >
          + Create New Server
        </Button>
      </div>

      {errorMsg && (
        <div className="w-full max-w-5xl mb-6 p-3 text-xs rounded bg-rose-950/40 border border-rose-800 text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Server Grid Sub-Component */}
      <div className="w-full max-w-5xl">
        <ServerGrid
          loading={loading}
          servers={servers}
          onOpenCreate={openCreateModal}
        />
      </div>

      {/* Create Server Modal Sub-Component */}
      <CreateServerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateServer}
        formError={formError}
        submitting={submitting}
        serverId={serverId}
        name={name}
        setName={setName}
        engine={engine}
        setEngine={setEngine}
        version={version}
        setVersion={setVersion}
        memoryMB={memoryMB}
        setMemoryMB={setMemoryMB}
        showAdvancedPorts={showAdvancedPorts}
        setShowAdvancedPorts={setShowAdvancedPorts}
        gamePort={gamePort}
        setGamePort={setGamePort}
        rconPort={rconPort}
        setRconPort={setRconPort}
        rconPassword={rconPassword}
        setRconPassword={setRconPassword}
        suggestedGamePort={suggestedGamePort}
        suggestedRconPort={suggestedRconPort}
        suggestedRconPass={suggestedRconPass}
      />
    </main>
  );
}