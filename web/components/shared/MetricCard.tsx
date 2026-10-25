import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ACCENT_TEXT = {
  success: 'text-success',
  warning: 'text-warning',
  neutral: 'text-foreground',
} as const;

interface MetricCardProps {
  title: string;
  accent?: keyof typeof ACCENT_TEXT;
  /** The big number, e.g. "1024 MB". */
  value: ReactNode;
  /** Small muted text right after the big number, e.g. "/ 2048 MB RAM". */
  valueSuffix?: ReactNode;
  /** Small line under the big number. */
  caption?: ReactNode;
  footerLabel: string;
  footerValue: ReactNode;
  footerSuffix?: ReactNode;
}

export function MetricCard({
  title,
  accent = 'neutral',
  value,
  valueSuffix,
  caption,
  footerLabel,
  footerValue,
  footerSuffix,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn('text-sm font-bold tracking-wide uppercase', ACCENT_TEXT[accent])}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-3xl font-extrabold tracking-tight">
            {value}
            {valueSuffix && (
              <span className="text-sm font-normal text-muted-foreground"> {valueSuffix}</span>
            )}
          </div>
          {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">{footerLabel}</span>
          <div>
            <span className={cn('text-base font-bold', ACCENT_TEXT[accent])}>{footerValue}</span>
            {footerSuffix && (
              <span className="text-xs text-muted-foreground"> {footerSuffix}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
