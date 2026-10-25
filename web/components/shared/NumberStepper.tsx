'use client';

import { useState, type ChangeEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Called with the final value after a +/- click or when the input loses focus. Use it to save. */
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  'aria-label'?: string;
}

export function NumberStepper({
  value,
  onChange,
  onCommit,
  min,
  max,
  step = 1,
  disabled,
  className,
  inputClassName,
  'aria-label': ariaLabel,
}: NumberStepperProps) {
  // While typing we keep the raw text, so the field can be empty. null = show `value`.
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

  const stepBy = (direction: 1 | -1) => {
    const next = clamp(value + direction * step);
    setDraft(null);
    onChange(next);
    onCommit?.(next);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setDraft(text);
    const parsed = Number(text);
    if (text.trim() !== '' && Number.isFinite(parsed)) onChange(parsed);
  };

  const handleBlur = () => {
    if (draft === null) return; // nothing was typed
    const parsed = Number(draft);
    const typedOk = draft.trim() !== '' && Number.isFinite(parsed);
    const next = clamp(typedOk ? parsed : value);
    setDraft(null);
    if (next !== value) onChange(next);
    onCommit?.(next);
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Decrease"
        disabled={disabled || (min !== undefined && value <= min)}
        onClick={() => stepBy(-1)}
      >
        <Minus />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        aria-label={ariaLabel}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={draft ?? String(value)}
        onChange={handleInput}
        onBlur={handleBlur}
        className={cn(
          'w-20 text-center font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          inputClassName
        )}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Increase"
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => stepBy(1)}
      >
        <Plus />
      </Button>
    </div>
  );
}
