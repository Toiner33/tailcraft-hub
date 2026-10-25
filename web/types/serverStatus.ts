/** Payload of GET /api/servers/[serverId]/docker/status (besides `success`). */
export interface ServerStatus {
  status: string;
  running: boolean;
  exists?: boolean;
  outOfSync?: boolean;
  startedAt?: string;
  name?: string;
}
