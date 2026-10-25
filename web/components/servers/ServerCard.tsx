import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServerProfile } from '@/types/server';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      {label}: <span className="text-foreground">{children}</span>
    </p>
  );
}

interface ServerCardProps {
  server: ServerProfile;
  onEdit: (server: ServerProfile) => void;
  onDelete: (server: ServerProfile) => void;
}

export function ServerCard({ server, onEdit, onDelete }: ServerCardProps) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-lg font-bold">
          <span className="truncate">{server.name}</span>
          <Badge variant="outline" className="shrink-0 font-mono">
            {server.engine}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 font-mono text-xs text-muted-foreground">
          <Detail label="ID">{server.id}</Detail>
          <Detail label="Version">{server.version}</Detail>
          <Detail label="Port">{server.gamePort}</Detail>
          <Detail label="RAM">{server.memoryMB} MB</Detail>
        </div>

        <div className="flex gap-2 pt-2">
          <Link
            href={`/servers/${server.id}`}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'flex-1')}
          >
            Manage →
          </Link>
          <Button variant="outline" size="sm" onClick={() => onEdit(server)}>
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(server)}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
