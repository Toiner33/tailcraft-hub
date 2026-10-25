import { SERVER_DEFAULTS_FALLBACKS } from '@/lib/constants';
import type { CreateServerInput, ServerEngine, ServerProfile } from '@/types/server';

/** Shape of `defaults` returned by GET /api/servers/template. */
export interface ServerDefaults {
  id: string;
  name: string;
  engine: ServerEngine;
  version: string;
  memoryMB: number;
  gamePort: number;
  rconPort: number;
  rconPassword: string;
}

/** Everything the create/edit form needs to start with. */
export interface ServerFormSeed {
  mode: 'create' | 'edit';
  serverId: string;
  name: string;
  engine: ServerEngine;
  version: string;
  memoryMB: number;
  /** '' means "automatic" */
  gamePort: string;
  rconPort: string;
  rconPassword: string;
  suggestedGamePort: number;
  suggestedRconPort: number;
  suggestedRconPass: string;
}

/** Values the user can change in the form. */
export interface ServerFormValues {
  name: string;
  engine: ServerEngine;
  version: string;
  memoryMB: number;
  showAdvancedPorts: boolean;
  gamePort: string;
  rconPort: string;
  rconPassword: string;
}

export function seedFromDefaults(defaults: ServerDefaults): ServerFormSeed {
  return {
    mode: 'create',
    serverId: defaults.id,
    name: defaults.name,
    engine: defaults.engine,
    version: defaults.version,
    memoryMB: defaults.memoryMB,
    gamePort: '',
    rconPort: '',
    rconPassword: '',
    suggestedGamePort: defaults.gamePort,
    suggestedRconPort: defaults.rconPort,
    suggestedRconPass: defaults.rconPassword,
  };
}

/** Used when the template endpoint cannot be reached. */
export function fallbackCreateSeed(existingServerCount: number): ServerFormSeed {
  return {
    mode: 'create',
    serverId: `srv-failed-${existingServerCount + 1}`,
    name: `Server ${existingServerCount + 1}`,
    engine: SERVER_DEFAULTS_FALLBACKS.engine,
    version: SERVER_DEFAULTS_FALLBACKS.version,
    memoryMB: SERVER_DEFAULTS_FALLBACKS.memoryMB,
    gamePort: '',
    rconPort: '',
    rconPassword: '',
    suggestedGamePort: SERVER_DEFAULTS_FALLBACKS.gamePort,
    suggestedRconPort: SERVER_DEFAULTS_FALLBACKS.rconPort,
    suggestedRconPass: SERVER_DEFAULTS_FALLBACKS.rconPassword,
  };
}

export function seedFromServer(server: ServerProfile): ServerFormSeed {
  return {
    mode: 'edit',
    serverId: server.id,
    name: server.name,
    engine: server.engine,
    version: server.version,
    memoryMB: server.memoryMB,
    gamePort: server.gamePort ? String(server.gamePort) : '',
    rconPort: server.rcon?.port ? String(server.rcon.port) : '',
    rconPassword: server.rcon?.password || '',
    suggestedGamePort: server.gamePort,
    suggestedRconPort: server.rcon?.port || SERVER_DEFAULTS_FALLBACKS.rconPort,
    suggestedRconPass: server.rcon?.password || SERVER_DEFAULTS_FALLBACKS.rconPassword,
  };
}

/** Body for POST /api/servers (create) and PUT /api/servers/[id] (edit). */
export function buildServerPayload(
  values: ServerFormValues,
  suggestedRconPass: string
): CreateServerInput {
  const payload: CreateServerInput = {
    name: values.name.trim(),
    engine: values.engine,
    version: values.version.trim(),
    memoryMB: Number(values.memoryMB),
    // Use what the user typed, otherwise the suggested/generated password.
    rconPassword: values.rconPassword.trim() || suggestedRconPass,
  };

  if (values.showAdvancedPorts) {
    if (values.gamePort.trim()) payload.gamePort = parseInt(values.gamePort, 10);
    if (values.rconPort.trim()) payload.rconPort = parseInt(values.rconPort, 10);
  }

  return payload;
}
