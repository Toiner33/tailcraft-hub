'use client';

import { useState } from 'react';
import { Dices, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PanelCard } from '@/components/shared/PanelCard';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { useServer } from '@/components/server-dashboard/ServerProvider';
import { useConfirm } from '@/hooks/use-confirm';
import { apiFetch } from '@/lib/apiClient';
import type { StatusMessage } from '@/types/statusMessage';

const LEVEL_TYPES = [
  { value: 'minecraft:normal', label: 'Default (Normal)' },
  { value: 'minecraft:flat', label: 'Superflat' },
  { value: 'minecraft:large_biomes', label: 'Large Biomes' },
  { value: 'minecraft:amplified', label: 'Amplified' },
  { value: 'minecraft:single_biome_surface', label: 'Single Biome' },
];

const DIFFICULTIES = [
  { value: 'peaceful', label: 'Peaceful' },
  { value: 'easy', label: 'Easy' },
  { value: 'normal', label: 'Normal' },
  { value: 'hard', label: 'Hard' },
];

function OptionSelect({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const currentLabel = options.find((option) => option.value === value)?.label ?? value;

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue>{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-card/60 p-2.5">
      <span>
        <span className="block text-xs font-semibold">{title}</span>
        <span className="block text-[11px] text-muted-foreground">{description}</span>
      </span>
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

export function WorldReset() {
  const { serverId, status, refreshStatus, notifyBackupsChanged } = useServer();
  const { confirm, confirmDialog } = useConfirm();

  const [seed, setSeed] = useState('');
  const [levelType, setLevelType] = useState('minecraft:normal');
  const [difficulty, setDifficulty] = useState('normal');
  const [hardcore, setHardcore] = useState(false);
  const [generateStructures, setGenerateStructures] = useState(true);

  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  const isServerRunning = Boolean(status?.running);

  const handleGenerateSeed = () => {
    // A random numeric seed that is safe as a JavaScript number
    setSeed(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString());
  };

  const handleResetWorld = async () => {
    // Ask the server for the current state instead of trusting the last poll.
    const fresh = await refreshStatus();
    if (fresh?.running) {
      setMessage({ variant: 'error', text: 'You must stop the server before resetting the world.' });
      return;
    }

    const confirmed = await confirm({
      title: 'Reset the world?',
      description:
        'DANGER: This will wipe your current map! (A safety backup will be automatically created).',
      confirmLabel: 'Reset World',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setIsResetting(true);
    setMessage({
      variant: 'info',
      text: 'Creating safety backup and resetting world generation settings...',
    });

    const result = await apiFetch<{ message: string }>(`/api/servers/${serverId}/world/reset`, {
      method: 'POST',
      body: { seed, levelType, difficulty, hardcore, generateStructures },
    });

    if (result.success) {
      setMessage({ variant: 'success', text: result.message });
      notifyBackupsChanged(); // the safety backup shows up in the backups list
    } else {
      setMessage({ variant: 'error', text: `Reset Failed: ${result.error}` });
    }
    setIsResetting(false);
  };

  return (
    <PanelCard
      title="World Generation & Reset"
      badge={
        isServerRunning && (
          <Badge variant="destructive">Server Running — Stop server to reset</Badge>
        )
      }
      description="Configure seed and generation settings before wiping and re-generating your world."
    >
      {message && <StatusBanner variant={message.variant}>{message.text}</StatusBanner>}

      <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/30 p-4 md:grid-cols-2">
        <div className="grid gap-1.5 md:col-span-2">
          <Label htmlFor="world-seed" className="text-xs font-semibold">
            World Seed
          </Label>
          <div className="flex gap-2">
            <Input
              id="world-seed"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              placeholder="Leave blank for random or enter custom seed"
              className="flex-1 font-mono"
            />
            <Button type="button" variant="outline" onClick={handleGenerateSeed}>
              <Dices data-icon="inline-start" />
              Randomize
            </Button>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="world-type" className="text-xs font-semibold">
            World Type
          </Label>
          <OptionSelect
            id="world-type"
            value={levelType}
            options={LEVEL_TYPES}
            onChange={setLevelType}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="world-difficulty" className="text-xs font-semibold">
            Difficulty
          </Label>
          <OptionSelect
            id="world-difficulty"
            value={difficulty}
            options={DIFFICULTIES}
            onChange={setDifficulty}
          />
        </div>

        <ToggleRow
          title="Hardcore Mode"
          description="Permadeath & Hard difficulty lock"
          checked={hardcore}
          onCheckedChange={setHardcore}
        />
        <ToggleRow
          title="Generate Structures"
          description="Villages, temples, strongholds"
          checked={generateStructures}
          onCheckedChange={setGenerateStructures}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          variant="destructive"
          onClick={handleResetWorld}
          disabled={isServerRunning || isResetting}
          title={isServerRunning ? 'Stop server to reset world' : 'Reset world'}
        >
          <TriangleAlert data-icon="inline-start" />
          {isResetting ? 'Resetting World...' : 'Reset & Generate New World'}
        </Button>
      </div>

      {confirmDialog}
    </PanelCard>
  );
}
