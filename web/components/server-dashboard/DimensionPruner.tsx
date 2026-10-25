'use client';

import { Button } from '@/components/ui/button';
import { NumberStepper } from '@/components/shared/NumberStepper';
import { OptionSelect } from '@/components/shared/OptionSelect';
import type { DimensionStats } from '@/types/dimensions';

export type TimeUnit = 'days' | 'months' | 'years';

const TIME_UNIT_OPTIONS = [
  { value: 'days', label: 'Days' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

interface DimensionPrunerProps {
  dimension: DimensionStats;
  value: number;
  unit: TimeUnit;
  onValueChange: (value: number) => void;
  onUnitChange: (unit: TimeUnit) => void;
  pruning: boolean;
  onPrune: (isFullReset: boolean) => void;
}

export function DimensionPruner({
  dimension,
  value,
  unit,
  onValueChange,
  onUnitChange,
  pruning,
  onPrune,
}: DimensionPrunerProps) {
  const disabled = pruning || dimension.fileCount === 0;

  return (
    <div className="space-y-3 border-t pt-4">
      <span className="block text-xs font-medium">
        Prune Inactive Regions for <span className="font-semibold">{dimension.name}</span>:
      </span>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <NumberStepper
          aria-label="Prune regions older than"
          value={value}
          onChange={onValueChange}
          min={1}
          inputClassName="w-16"
        />
        <OptionSelect
          value={unit}
          options={TIME_UNIT_OPTIONS}
          onChange={(next) => onUnitChange(next as TimeUnit)}
          className="sm:w-36"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
        <Button variant="warning" disabled={disabled} onClick={() => onPrune(false)}>
          {pruning ? 'Pruning...' : `Prune Older Than ${value} ${unit}`}
        </Button>
        <Button variant="destructive" disabled={disabled} onClick={() => onPrune(true)}>
          Full Reset {dimension.name}
        </Button>
      </div>
    </div>
  );
}
