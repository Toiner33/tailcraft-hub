'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog, type ConfirmVariant } from '@/components/shared/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /** Adds a checkbox to the dialog. Its final state comes back from `confirmWithCheckbox`. */
  checkbox?: { label: ReactNode; defaultChecked?: boolean };
}

export interface ConfirmResult {
  confirmed: boolean;
  /** State of the checkbox when the dialog closed (false if there is no checkbox). */
  checked: boolean;
}

/**
 * Promise-based replacement for window.confirm().
 *
 *   const { confirm, confirmWithCheckbox, confirmDialog } = useConfirm();
 *   ...
 *   const ok = await confirm({ title: 'Delete server?', variant: 'destructive' });
 *   const { confirmed, checked } = await confirmWithCheckbox({ title: '...', checkbox: { label: '...' } });
 *   ...
 *   return (<>{...your JSX...}{confirmDialog}</>);
 *
 * `confirmDialog` must be rendered once somewhere in the component.
 */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  // Options stay set after closing so the text does not vanish during the exit animation.
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const [checked, setChecked] = useState(false);
  const checkedRef = useRef(false);
  const resolverRef = useRef<((result: ConfirmResult) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.({ confirmed, checked: checkedRef.current });
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const confirmWithCheckbox = useCallback((next: ConfirmOptions) => {
    // An unanswered earlier question counts as "no".
    resolverRef.current?.({ confirmed: false, checked: checkedRef.current });
    checkedRef.current = next.checkbox?.defaultChecked ?? false;
    setChecked(checkedRef.current);
    setOptions(next);
    setOpen(true);
    return new Promise<ConfirmResult>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const confirm = useCallback(
    async (next: ConfirmOptions) => (await confirmWithCheckbox(next)).confirmed,
    [confirmWithCheckbox]
  );

  const handleCheckedChange = (value: boolean) => {
    checkedRef.current = value;
    setChecked(value);
  };

  const { checkbox, ...dialogOptions } = options;

  const confirmDialog = (
    <ConfirmDialog
      {...dialogOptions}
      checkbox={
        checkbox
          ? { label: checkbox.label, checked, onCheckedChange: handleCheckedChange }
          : undefined
      }
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) settle(false); // Cancel button or Escape key
      }}
      onConfirm={() => settle(true)}
    />
  );

  return { confirm, confirmWithCheckbox, confirmDialog };
}
