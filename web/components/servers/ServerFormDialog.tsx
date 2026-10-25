'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ServerForm } from '@/components/servers/ServerForm';
import type { ServerFormSeed } from '@/lib/serverForm';

interface ServerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kept after closing so the content does not vanish during the exit animation. */
  seed: ServerFormSeed | null;
  /** Changes on every open, which remounts the form with fresh state. */
  session: number;
  onSaved: () => void;
}

export function ServerFormDialog({
  open,
  onOpenChange,
  seed,
  session,
  onSaved,
}: ServerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {seed && (
          <ServerForm
            key={session}
            seed={seed}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
