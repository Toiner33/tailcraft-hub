'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog, type ConfirmVariant } from '@/components/shared/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

/**
 * Promise-based replacement for window.confirm().
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   ...
 *   const ok = await confirm({ title: 'Delete server?', variant: 'destructive' });
 *   if (!ok) return;
 *   ...
 *   return (<>{...your JSX...}{confirmDialog}</>);
 *
 * `confirmDialog` must be rendered once somewhere in the component.
 */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  // Options stay set after closing so the text does not vanish during the exit animation.
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolverRef.current?.(false); // an unanswered earlier confirm counts as "no"
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const confirmDialog = (
    <ConfirmDialog
      {...options}
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) settle(false); // Cancel button or Escape key
      }}
      onConfirm={() => settle(true)}
    />
  );

  return { confirm, confirmDialog };
}
