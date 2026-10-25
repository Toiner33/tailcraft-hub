import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

import { ServerProvider } from '@/components/server-dashboard/ServerProvider';
import { ServerControl } from '@/components/server-dashboard/ServerControl';
import { BackupManager } from '@/components/server-dashboard/BackupManager';
import { WorldReset } from '@/components/server-dashboard/WorldReset';
import { RconConsole } from '@/components/server-dashboard/RconConsole';
import { DockerLogs } from '@/components/server-dashboard/DockerLogs';
import { ResourceMetrics } from '@/components/server-dashboard/ResourceMetrics';
import ServerPropertiesEditor from '@/components/ServerPropertiesEditor';
import DimensionAnalytics from '@/components/DimensionAnalytics';
import GameRulesPanel from '@/components/GameRulesPanel';

interface ServerDashboardPageProps {
  params: Promise<{
    serverId: string;
  }>;
}

export default async function ServerDashboardPage({ params }: ServerDashboardPageProps) {
  const { serverId } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-zinc-950 text-zinc-100">
      {/* Top Header & Navigation */}
      <div className="w-full max-w-5xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
            Server Management Hub
          </h1>
          <p className="text-xs text-zinc-400 font-mono">
            Active Server ID: <span className="text-emerald-400 font-semibold">{serverId}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/">
            <Button variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs">
              ← Back to Home Menu
            </Button>
          </Link>
        </div>
      </div>

      {/* One shared status poll for every panel inside the provider */}
      <ServerProvider serverId={serverId}>
        <div className="w-full max-w-5xl flex flex-col items-center space-y-6">
          <ResourceMetrics serverId={serverId} />
          <ServerControl />
          <ServerPropertiesEditor serverId={serverId} />
          <BackupManager />
          <WorldReset />
          <DimensionAnalytics serverId={serverId} />
          <GameRulesPanel serverId={serverId} />
          {/* Side-by-side or stacked terminal and logs */}
          <div className="w-full max-w-5xl flex flex-col items-center space-y-6">
            <RconConsole serverId={serverId} />
            <DockerLogs serverId={serverId} />
          </div>
        </div>
      </ServerProvider>
    </main>
  );
}
