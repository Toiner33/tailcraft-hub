import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PanelCardProps {
  title: ReactNode;
  /** Small element shown right after the title (a Badge, a "LIVE" tag...). */
  badge?: ReactNode;
  description?: ReactNode;
  /** Buttons or controls aligned to the right of the header. */
  actions?: ReactNode;
  /** Shows `loadingText` instead of `children`, but keeps the header visible. */
  loading?: boolean;
  loadingText?: string;
  className?: string;
  children?: ReactNode;
}

/** The common shell of every dashboard panel: header (title, badge, actions) + body. */
export function PanelCard({
  title,
  badge,
  description,
  actions,
  loading = false,
  loadingText = 'Loading...',
  className,
  children,
}: PanelCardProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-xl font-bold">{title}</CardTitle>
              {badge}
            </div>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">{loadingText}</p> : children}
      </CardContent>
    </Card>
  );
}
