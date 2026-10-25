'use client';

import { cn } from 'cn';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NumberStepper } from '@/components/shared/NumberStepper';
import { resolvePropertySchema } from '@/lib/serverPropertySchemas';

interface PropertyFieldProps {
  name: string;
  value: string;
  /** Locked properties are managed by TailCraft Hub and cannot be edited. */
  locked: boolean;
  onChange: (value: string) => void;
}

function Control({ name, value, locked, onChange }: PropertyFieldProps) {
  if (locked) {
    return <Input value={value} disabled className="font-mono select-none" />;
  }

  const schema = resolvePropertySchema(name, value);

  switch (schema.kind) {
    case 'boolean': {
      const checked = value === 'true';
      return (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={name}
          onClick={() => onChange(checked ? 'false' : 'true')}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
            checked ? 'bg-primary' : 'bg-muted-foreground/40'
          )}
        >
          <span
            className={cn(
              'inline-block size-4 rounded-full bg-white transition-transform',
              checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      );
    }

    case 'enum': {
      // Keep the current value selectable even if it is not in the known list.
      const options = schema.options.includes(value) ? schema.options : [value, ...schema.options];
      return (
        <Select
          value={value}
          onValueChange={(next) => {
            if (next) onChange(next);
          }}
        >
          <SelectTrigger className="w-full font-mono" aria-label={name}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option} className="font-mono">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    case 'integer':
      return (
        <NumberStepper
          aria-label={name}
          value={Number(value)}
          onChange={(next) => onChange(String(next))}
          min={schema.min}
          max={schema.max}
          step={schema.step}
          inputClassName="w-24"
        />
      );

    case 'text':
      return (
        <Input
          aria-label={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono"
        />
      );
  }
}

export function PropertyField(props: PropertyFieldProps) {
  const { name, locked } = props;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-2.5 transition-colors',
        locked ? 'bg-muted/30 opacity-60' : 'bg-card'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('font-mono text-xs font-semibold', locked && 'line-through')}>
          {name}
        </span>
        {locked && (
          <span className="rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            System Locked
          </span>
        )}
      </div>
      <Control {...props} />
    </div>
  );
}
