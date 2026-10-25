'use client';

import { MetricCard } from '@/components/shared/MetricCard';
import { useApiResource } from '@/hooks/use-api-resource';
import type { MetricsData } from '@/types/metrics';

const METRICS_POLL_MS = 3000;
const EMPTY = '---';

interface ResourceMetricsProps {
  serverId: string;
}

export function ResourceMetrics({ serverId }: ResourceMetricsProps) {
  // On a failed refresh the hook keeps the last good data, like the old version did.
  const { data } = useApiResource<{ metrics: MetricsData }>(`/api/servers/${serverId}/metrics`, {
    intervalMs: METRICS_POLL_MS,
  });
  const metrics = data?.metrics ?? null;

  return (
    <div className="my-8 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
      <MetricCard
        title="Minecraft Container"
        accent="success"
        value={metrics ? `${metrics.container.ramUsedMB} MB` : EMPTY}
        valueSuffix={metrics ? `/ ${metrics.container.ramLimitMB} MB RAM` : undefined}
        caption={
          metrics
            ? `${metrics.container.ramPercent}% of Container Limit (${metrics.container.ramVsHostPercent}% of Host)`
            : 'Loading...'
        }
        footerLabel="CPU Usage:"
        footerValue={metrics ? `${metrics.container.cpuPercent}%` : EMPTY}
      />

      <MetricCard
        title="World Storage"
        accent="warning"
        value={metrics ? `${metrics.storage.folderSizeMB} MB` : EMPTY}
        caption={
          metrics ? `${metrics.storage.folderVsDiskPercent}% of Total Disk Space` : 'Loading...'
        }
        footerLabel="Free Space:"
        footerValue={metrics ? `${metrics.storage.diskFreeGB} GB` : EMPTY}
        footerSuffix={metrics ? `/ ${metrics.storage.diskTotalGB} GB` : undefined}
      />

      <MetricCard
        title="Host System"
        value={metrics ? `${metrics.host.ramUsedGB} GB` : EMPTY}
        valueSuffix={metrics ? `/ ${metrics.host.ramTotalGB} GB` : undefined}
        caption={metrics ? `Total Host RAM Used (${metrics.host.ramPercent}%)` : 'Loading...'}
        footerLabel="Available Cores:"
        footerValue={metrics ? `${metrics.host.cpuCores} Cores` : EMPTY}
      />
    </div>
  );
}
