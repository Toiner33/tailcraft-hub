'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SERVER_ENGINES_MAP, type ServerEngine } from '@/types/server';

interface EngineSelectProps {
  id?: string;
  value: ServerEngine;
  onChange: (engine: ServerEngine) => void;
}

export function EngineSelect({ id, value, onChange }: EngineSelectProps) {
  const engines = Object.values(SERVER_ENGINES_MAP);
  const currentLabel = engines.find((engine) => engine.nameId === value)?.label ?? value;

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as ServerEngine);
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue>{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {engines.map((engine) => (
          <SelectItem key={engine.nameId} value={engine.nameId}>
            {engine.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
