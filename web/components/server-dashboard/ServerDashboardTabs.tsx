'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackupManager } from '@/components/server-dashboard/BackupManager';
import { DimensionAnalytics } from '@/components/server-dashboard/DimensionAnalytics';
import { DockerLogs } from '@/components/server-dashboard/DockerLogs';
import { GameRulesPanel } from '@/components/server-dashboard/GameRulesPanel';
import { RconConsole } from '@/components/server-dashboard/RconConsole';
import { ResourceMetrics } from '@/components/server-dashboard/ResourceMetrics';
import { ServerControl } from '@/components/server-dashboard/ServerControl';
import { ServerPropertiesEditor } from '@/components/server-dashboard/ServerPropertiesEditor';
import { WorldReset } from '@/components/server-dashboard/WorldReset';
import { DASHBOARD_TABS, type DashboardTabId } from '@/lib/dashboardTabs';

interface ServerDashboardTabsProps {
  defaultTab: DashboardTabId;
}

/**
 * The server dashboard, one tab per area. Only the open tab is mounted, so panels in
 * hidden tabs do not poll the server. Must be rendered inside a <ServerProvider>.
 */
export function ServerDashboardTabs({ defaultTab }: ServerDashboardTabsProps) {
  // Keep the open tab in the URL (?tab=console) so a refresh or a shared link opens the same tab.
  const handleTabChange = (value: unknown) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', String(value));
    window.history.replaceState(null, '', url);
  };

  return (
    <Tabs defaultValue={defaultTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full rounded-full sm:w-fit">
        {DASHBOARD_TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="rounded-full">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="space-y-6 pt-4">
        <ResourceMetrics />
        <ServerControl />
      </TabsContent>

      <TabsContent value="console" className="space-y-6 pt-4">
        <RconConsole />
        <DockerLogs />
      </TabsContent>

      <TabsContent value="config" className="space-y-6 pt-4">
        <ServerPropertiesEditor />
        <GameRulesPanel />
      </TabsContent>

      <TabsContent value="world" className="space-y-6 pt-4">
        <WorldReset />
        <DimensionAnalytics />
      </TabsContent>

      <TabsContent value="backups" className="space-y-6 pt-4">
        <BackupManager />
      </TabsContent>
    </Tabs>
  );
}
