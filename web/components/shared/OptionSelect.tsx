'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SelectOption {
  value: string;
  label: string;
}

interface OptionSelectProps {
  id?: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

/** A shadcn Select for a plain list of { value, label } options. */
export function OptionSelect({ id, value, options, onChange, className, disabled }: OptionSelectProps) {
  const currentLabel = options.find((option) => option.value === value)?.label ?? value;

  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
    >
      <SelectTrigger id={id} className={className ?? 'w-full'}>
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
