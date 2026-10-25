'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SERVER_DEFAULTS_FALLBACKS } from '@/lib/constants';

export type VersionMode = 'latest' | 'list' | 'custom';

interface VersionPickerProps {
  id: string;
  mode: VersionMode;
  onLatestChange: (checked: boolean) => void;
  onCustomChange: (checked: boolean) => void;
  versions: string[];
  loading: boolean;
  /** The version currently in effect (shown in the list or the custom field). */
  value: string;
  onValueChange: (value: string) => void;
}

export function VersionPicker({
  id,
  mode,
  onLatestChange,
  onCustomChange,
  versions,
  loading,
  value,
  onValueChange,
}: VersionPickerProps) {
  // Keep the current value selectable even when the fetched list does not contain it.
  const items = value && !versions.includes(value) ? [value, ...versions] : versions;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs">
          Minecraft Version
          {loading && (
            <span className="animate-pulse text-[10px] font-normal text-muted-foreground">
              (Loading...)
            </span>
          )}
        </Label>
        <div className="flex items-center gap-3">
          <Label className="cursor-pointer gap-1 text-[10px] font-normal text-success">
            <Checkbox checked={mode === 'latest'} onCheckedChange={onLatestChange} />
            Latest
          </Label>
          <Label className="cursor-pointer gap-1 text-[10px] font-normal text-success">
            <Checkbox
              checked={mode === 'custom'}
              disabled={mode === 'latest'}
              onCheckedChange={onCustomChange}
            />
            Custom
          </Label>
        </div>
      </div>

      {mode === 'latest' ? (
        <Input id={id} disabled value={SERVER_DEFAULTS_FALLBACKS.version} className="font-mono" />
      ) : mode === 'custom' ? (
        <Input
          id={id}
          required
          placeholder="e.g. 1.21.4"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="font-mono"
        />
      ) : (
        <Select
          value={value}
          disabled={loading}
          onValueChange={(next) => {
            if (next) onValueChange(next);
          }}
        >
          <SelectTrigger id={id} className="w-full font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((version) => (
              <SelectItem key={version} value={version} className="font-mono">
                {version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
