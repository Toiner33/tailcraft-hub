'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberStepper } from '@/components/shared/NumberStepper';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { AdvancedPortsSection, type PortFields } from '@/components/servers/AdvancedPortsSection';
import { EngineSelect } from '@/components/servers/EngineSelect';
import { VersionPicker, type VersionMode } from '@/components/servers/VersionPicker';
import { useMinecraftVersions } from '@/hooks/use-minecraft-versions';
import { apiFetch } from '@/lib/apiClient';
import { SERVER_DEFAULTS_FALLBACKS } from '@/lib/constants';
import { buildServerPayload, type ServerFormSeed } from '@/lib/serverForm';
import type { ServerEngine } from '@/types/server';

const MEMORY_MIN_MB = 1024;
const MEMORY_STEP_MB = 512;

interface ServerFormProps {
  seed: ServerFormSeed;
  onCancel: () => void;
  onSaved: () => void;
}

/**
 * The create/edit form. It is mounted fresh every time the dialog opens, so its
 * initial state comes straight from `seed` (no syncing effects needed).
 */
export function ServerForm({ seed, onCancel, onSaved }: ServerFormProps) {
  const isEditing = seed.mode === 'edit';
  const startsOnLatest = isEditing && seed.version === SERVER_DEFAULTS_FALLBACKS.version;

  const [name, setName] = useState(seed.name);
  const [engine, setEngine] = useState<ServerEngine>(seed.engine);
  const [memoryMB, setMemoryMB] = useState(seed.memoryMB);

  const [versionMode, setVersionMode] = useState<VersionMode>(startsOnLatest ? 'latest' : 'list');
  // null = "use the first version of the list" (what creating a server does by default)
  const [selectedVersion, setSelectedVersion] = useState<string | null>(
    isEditing && !startsOnLatest ? seed.version : null
  );
  const [customVersion, setCustomVersion] = useState('');

  const [showAdvancedPorts, setShowAdvancedPorts] = useState(false);
  const [ports, setPorts] = useState<PortFields>({
    gamePort: seed.gamePort,
    rconPort: seed.rconPort,
    rconPassword: seed.rconPassword,
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { versions, loading: loadingVersions } = useMinecraftVersions(engine);

  const version =
    versionMode === 'latest'
      ? SERVER_DEFAULTS_FALLBACKS.version
      : versionMode === 'custom'
        ? customVersion
        : (selectedVersion ?? versions[0] ?? SERVER_DEFAULTS_FALLBACKS.version);

  const handleEngineChange = (next: ServerEngine) => {
    setEngine(next);
    // When creating, follow the new engine's first version instead of keeping a stale pick.
    if (!isEditing) setSelectedVersion(null);
  };

  const handleLatestChange = (checked: boolean) => {
    if (checked) {
      setVersionMode('latest');
    } else {
      setVersionMode('list');
      setSelectedVersion(null);
    }
  };

  const handleCustomChange = (checked: boolean) => {
    if (checked) {
      setCustomVersion(version);
      setVersionMode('custom');
    } else {
      setSelectedVersion(customVersion.trim() || null);
      setVersionMode('list');
    }
  };

  const handleVersionValue = (value: string) => {
    if (versionMode === 'custom') setCustomVersion(value);
    else setSelectedVersion(value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setSubmitting(true);

    const payload = buildServerPayload(
      { name, engine, version, memoryMB, showAdvancedPorts, ...ports },
      seed.suggestedRconPass
    );

    const result = await apiFetch(
      isEditing ? `/api/servers/${seed.serverId}` : '/api/servers',
      { method: isEditing ? 'PUT' : 'POST', body: payload }
    );

    setSubmitting(false);
    if (result.success) onSaved();
    else setFormError(result.error);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">
          {isEditing ? `Edit Server (${seed.serverId})` : 'Deploy New Minecraft Server'}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update this server's profile."
            : 'Configure a new isolated Minecraft instance.'}
        </DialogDescription>
      </DialogHeader>

      <StatusBanner variant="error">{formError}</StatusBanner>

      <div className="grid gap-1.5">
        <Label htmlFor="server-id" className="text-xs">
          Server ID
        </Label>
        <Input id="server-id" disabled value={seed.serverId} className="font-mono" />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="server-name" className="text-xs">
          Server Name
        </Label>
        <Input
          id="server-name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid content-start gap-1.5">
          <Label htmlFor="server-engine" className="text-xs">
            Engine
          </Label>
          <EngineSelect id="server-engine" value={engine} onChange={handleEngineChange} />
        </div>

        <VersionPicker
          id="server-version"
          mode={versionMode}
          onLatestChange={handleLatestChange}
          onCustomChange={handleCustomChange}
          versions={versions}
          loading={loadingVersions}
          value={version}
          onValueChange={handleVersionValue}
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Allocated RAM (MB)</Label>
        <NumberStepper
          aria-label="Allocated RAM in megabytes"
          value={memoryMB}
          onChange={setMemoryMB}
          min={MEMORY_MIN_MB}
          step={MEMORY_STEP_MB}
          inputClassName="w-full"
          className="[&>div]:flex-1"
        />
      </div>

      <AdvancedPortsSection
        open={showAdvancedPorts}
        onOpenChange={setShowAdvancedPorts}
        ports={ports}
        onPortsChange={(patch) => setPorts((prev) => ({ ...prev, ...patch }))}
        suggested={{
          gamePort: seed.suggestedGamePort,
          rconPort: seed.suggestedRconPort,
          rconPassword: seed.suggestedRconPass,
        }}
      />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting
            ? isEditing
              ? 'Saving...'
              : 'Deploying...'
            : isEditing
              ? 'Save Changes'
              : 'Create Server'}
        </Button>
      </DialogFooter>
    </form>
  );
}
