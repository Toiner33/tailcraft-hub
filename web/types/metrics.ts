/** Payload `metrics` of GET /api/servers/[serverId]/metrics. */
export interface MetricsData {
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
