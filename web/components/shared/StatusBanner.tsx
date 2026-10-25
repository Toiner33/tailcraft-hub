import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

const statusBannerVariants = cva('rounded-lg border px-3 py-2.5 text-xs', {
  variants: {
    variant: {
      info: 'border-border bg-muted text-foreground',
      success: 'border-success/30 bg-success/10 text-success',
      warning: 'border-warning/30 bg-warning/10 text-warning',
      error: 'border-destructive/30 bg-destructive/10 text-destructive',
    },
  },
  defaultVariants: { variant: 'info' },
});

interface StatusBannerProps extends VariantProps<typeof statusBannerVariants> {
  className?: string;
  /** Renders nothing when empty, so you can pass a message state directly. */
  children?: ReactNode;
}

export function StatusBanner({ variant, className, children }: StatusBannerProps) {
  if (children === null || children === undefined || children === false || children === '') {
    return null;
  }

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(statusBannerVariants({ variant }), className)}
    >
      {children}
    </div>
  );
}
