'use client';

import { Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OptionSelect } from '@/components/shared/OptionSelect';

/** The world generation settings shared by "Create your world" and "Regenerate world". */
export interface WorldSettings {
  seed: string;
  levelType: string;
  difficulty: string;
  hardcore: boolean;
  generateStructures: boolean;
}

export const DEFAULT_WORLD_SETTINGS: WorldSettings = {
  seed: '',
  levelType: 'minecraft:normal',
  difficulty: 'normal',
  hardcore: false,
  generateStructures: true,
};

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

interface WorldSettingsFieldsProps {
  value: WorldSettings;
  /** Receives only the fields that changed. */
  onChange: (patch: Partial<WorldSettings>) => void;
}

export function WorldSettingsFields({ value, onChange }: WorldSettingsFieldsProps) {
  const handleGenerateSeed = () => {
    // A random numeric seed that is safe as a JavaScript number
    onChange({ seed: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString() });
  };

  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/30 p-4 md:grid-cols-2">
      <div className="grid gap-1.5 md:col-span-2">
        <Label htmlFor="world-seed" className="text-xs font-semibold">
          World Seed
        </Label>
        <div className="flex gap-2">
          <Input
            id="world-seed"
            value={value.seed}
            onChange={(event) => onChange({ seed: event.target.value })}
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
          value={value.levelType}
          options={LEVEL_TYPES}
          onChange={(levelType) => onChange({ levelType })}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="world-difficulty" className="text-xs font-semibold">
          Difficulty
        </Label>
        <OptionSelect
          id="world-difficulty"
          value={value.difficulty}
          options={DIFFICULTIES}
          onChange={(difficulty) => onChange({ difficulty })}
        />
      </div>

      <ToggleRow
        title="Hardcore Mode"
        description="Permadeath & Hard difficulty lock"
        checked={value.hardcore}
        onCheckedChange={(hardcore) => onChange({ hardcore })}
      />
      <ToggleRow
        title="Generate Structures"
        description="Villages, temples, strongholds"
        checked={value.generateStructures}
        onCheckedChange={(generateStructures) => onChange({ generateStructures })}
      />
    </div>
  );
}
