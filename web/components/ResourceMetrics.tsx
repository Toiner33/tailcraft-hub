'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricsData {
  container: {
    cpuPercent: number;
    ramUsedMB: string;
    ramLimitMB: string;
    ramPercent: number;
    ramVsHostPercent: string;
  };
  storage: {
    folderSizeMB: string;
    folderSizeGB: string;
    folderVsDiskPercent: string;
    diskFreeGB: string;
    diskTotalGB: string;
  };
  host: {
    cpuCores: number;
    ramUsedGB: string;
    ramTotalGB: string;
    ramPercent: string;
  };
}

export default function ResourceMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      // Retain state on transient errors
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
      {/* 1. Minecraft Container Stat Card */}
      <Card className="border-zinc-800 bg-zinc-900 text-zinc-100 p-2 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-emerald-400 uppercase tracking-wide font-bold">
            Minecraft Container
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {metrics ? `${metrics.container.ramUsedMB} MB` : '---'}
              <span className="text-sm font-normal text-zinc-400"> / {metrics?.container.ramLimitMB} MB RAM</span>
            </div>
            <p className="text-xs text-zinc-300 mt-1">
              {metrics ? `${metrics.container.ramPercent}% of Container Limit (${metrics.container.ramVsHostPercent}% of Host)` : 'Loading...'}
            </p>
          </div>
          <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
            <span className="text-sm text-zinc-400">CPU Usage:</span>
            <span className="text-base font-bold text-emerald-400">
              {metrics ? `${metrics.container.cpuPercent}%` : '---'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. World Storage Stat Card */}
      <Card className="border-zinc-800 bg-zinc-900 text-zinc-100 p-2 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-amber-400 uppercase tracking-wide font-bold">
            World Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {metrics ? `${metrics.storage.folderSizeMB} MB` : '---'}
            </div>
            <p className="text-xs text-zinc-300 mt-1">
              {metrics ? `${metrics.storage.folderVsDiskPercent}% of Total Disk Space` : 'Loading...'}
            </p>
          </div>
          <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
            <span className="text-sm text-zinc-400">Free Space:</span>
            <div>
              <span className="text-base font-bold text-amber-400">
                {metrics ? `${metrics.storage.diskFreeGB} GB` : '---'}
              </span>
              <span className="text-xs text-zinc-500"> / {metrics?.storage.diskTotalGB} GB</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Host System Stat Card */}
      <Card className="border-zinc-800 bg-zinc-900 text-zinc-100 p-2 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-indigo-400 uppercase tracking-wide font-bold">
            Host System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {metrics ? `${metrics.host.ramUsedGB} GB` : '---'}
              <span className="text-sm font-normal text-zinc-400"> / {metrics?.host.ramTotalGB} GB</span>
            </div>
            <p className="text-xs text-zinc-300 mt-1">
              {metrics ? `Total Host RAM Used (${metrics.host.ramPercent}%)` : 'Loading...'}
            </p>
          </div>
          <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
            <span className="text-sm text-zinc-400">Available Cores:</span>
            <span className="text-base font-bold text-indigo-400">
              {metrics ? `${metrics.host.cpuCores} Cores` : '---'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
