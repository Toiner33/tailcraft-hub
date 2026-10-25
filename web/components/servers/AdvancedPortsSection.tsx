'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface PortFields {
  gamePort: string;
  rconPort: string;
  rconPassword: string;
}

interface AdvancedPortsSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ports: PortFields;
  onPortsChange: (patch: Partial<PortFields>) => void;
  suggested: { gamePort: number; rconPort: number; rconPassword: string };
}

export function AdvancedPortsSection({
  open,
  onOpenChange,
  ports,
  onPortsChange,
  suggested,
}: AdvancedPortsSectionProps) {
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="border-t pt-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-success"
        onClick={() => onOpenChange(!open)}
      >
        <Chevron data-icon="inline-start" />
        Advanced: Manual Port &amp; RCON Configuration
      </Button>

      {open && (
        <div className="mt-3 space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label htmlFor="game-port" className="font-mono text-[11px] text-muted-foreground">
                Game Port (Auto: {suggested.gamePort})
              </Label>
              <Input
                id="game-port"
                type="number"
                placeholder={String(suggested.gamePort)}
                value={ports.gamePort}
                onChange={(event) => onPortsChange({ gamePort: event.target.value })}
                className="font-mono"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="rcon-port" className="font-mono text-[11px] text-muted-foreground">
                RCON Port (Auto: {suggested.rconPort})
              </Label>
              <Input
                id="rcon-port"
                type="number"
                placeholder={String(suggested.rconPort)}
                value={ports.rconPort}
                onChange={(event) => onPortsChange({ rconPort: event.target.value })}
                className="font-mono"
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rcon-password" className="font-mono text-[11px] text-muted-foreground">
              RCON Password
            </Label>
            <Input
              id="rcon-password"
              type="text"
              placeholder={suggested.rconPassword}
              value={ports.rconPassword}
              onChange={(event) => onPortsChange({ rconPassword: event.target.value })}
              className="font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}
