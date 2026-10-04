import Link from 'next/link';
import { Button } from '@/components/ui/button';

import ServerControl from '@/components/ServerControl';
import RconConsole from '@/components/RconConsole';
import DockerLogs from '@/components/DockerLogs';
import ResourceMetrics from '@/components/ResourceMetrics';
import ServerPropertiesEditor from '@/components/ServerPropertiesEditor';
import BackupManager from '@/components/BackupManager';
import WorldReset from '@/components/WorldReset';
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
        <Link href="/">
          <Button variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs">
            ← Back to Home Menu
          </Button>
        </Link>
      </div>

      {/* All 9 Components passing serverId */}
      <div className="w-full max-w-5xl flex flex-col items-center space-y-6">
        <ResourceMetrics serverId={serverId} />
        <ServerControl serverId={serverId} />
        <ServerPropertiesEditor serverId={serverId} />
        <BackupManager serverId={serverId} />
        <WorldReset serverId={serverId} />
        <DimensionAnalytics serverId={serverId} />
        <GameRulesPanel serverId={serverId} />
        {/* Side-by-side or stacked terminal and logs */}
        <div className="w-full max-w-5xl flex flex-col items-center space-y-6">
          <RconConsole serverId={serverId} />
          <DockerLogs serverId={serverId} />
        </div>
      </div>
    </main>
  );
}