/** Payload of GET /api/servers/[serverId]/docker/status (besides `success`). */
export interface ServerStatus {
  status: string;
  running: boolean;
  exists?: boolean;
  outOfSync?: boolean;
  startedAt?: string;
  name?: string;
  /** Only set when the container does not exist: whether the world folder already has data. */
  worldExists?: boolean;
}
