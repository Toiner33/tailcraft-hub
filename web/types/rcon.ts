export interface RconConnection {
  host?: string | unknown;      // Hostname/IP (e.g., "localhost" or "127.0.0.1")
  port: number;                 // Dynamic RCON port (e.g., 25575)
  password: string;             // RCON authentication string
  timeoutMs?: number;           // Optional timeout in milliseconds for RCON connection
}

export interface RconCommandResult {
  success: boolean;
  response?: string;       // Combined joined string for single-string use cases
  responses?: string[];    // Individual response per command for index-based mapping
  error?: string;
}