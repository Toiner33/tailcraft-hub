'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NumberStepper } from '@/components/shared/NumberStepper';
import type { GameruleDefinition } from '@/types/gamerules';

interface GameruleCardProps {
  rule: GameruleDefinition;
  value: boolean | number;
  /** Boolean rules: the new value, to save right away. */
  onToggle: (name: string, value: boolean) => void;
  /** Integer rules: called while typing or stepping (local change only). */
  onNumberChange: (name: string, value: number) => void;
  /** Integer rules: called when the value is final (save it). */
  onNumberCommit: (name: string, value: number) => void;
}

export function GameruleCard({
  rule,
  value,
  onToggle,
  onNumberChange,
  onNumberCommit,
}: GameruleCardProps) {
  return (
    <div className="flex flex-col justify-between gap-2 rounded-lg border bg-card p-3">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold break-all">{rule.name}</span>
          <Badge variant="outline" className="shrink-0">
            {rule.category}
          </Badge>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{rule.description}</p>
      </div>

      <div className="mt-1 flex items-center justify-between border-t pt-2">
        <span className="font-mono text-[10px] text-muted-foreground uppercase">
          Type: {rule.type}
        </span>

        {rule.type === 'boolean' ? (
          <Button
            size="sm"
            variant={value ? 'success' : 'destructive'}
            onClick={() => onToggle(rule.name, !value)}
          >
            {value ? 'TRUE' : 'FALSE'}
          </Button>
        ) : (
          <NumberStepper
            aria-label={rule.name}
            value={Number(value) || 0}
            min={rule.min ?? 0}
            max={rule.max}
            onChange={(next) => onNumberChange(rule.name, next)}
            onCommit={(next) => onNumberCommit(rule.name, next)}
            inputClassName="w-16"
          />
        )}
      </div>
    </div>
  );
}
