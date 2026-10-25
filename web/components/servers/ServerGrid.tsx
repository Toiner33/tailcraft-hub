import { Plus } from 'lucide-react';
import { ServerCard } from '@/components/servers/ServerCard';
import type { ServerProfile } from '@/types/server';

interface ServerGridProps {
  loading: boolean;
  servers: ServerProfile[];
  onCreate: () => void;
  onEdit: (server: ServerProfile) => void;
  onDelete: (server: ServerProfile) => void;
}

export function ServerGrid({ loading, servers, onCreate, onEdit, onDelete }: ServerGridProps) {
  if (loading) {
    return (
      <p className="py-12 text-center text-xs text-muted-foreground italic">
        Loading server configurations...
      </p>
    );
  }

  if (servers.length === 0) {
    return (
      <button
        type="button"
        onClick={onCreate}
        className="group w-full space-y-3 rounded-xl border border-dashed bg-card/40 p-12 text-center transition-all hover:border-ring hover:bg-card/80"
      >
        <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/20 group-hover:text-primary">
          <Plus className="size-5" />
        </span>
        <span className="block text-base font-semibold">No servers configured yet</span>
        <span className="mx-auto block max-w-md text-xs text-muted-foreground">
          Click here or on &quot;Create New Server&quot; to deploy your first isolated Minecraft
          instance.
        </span>
      </button>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {servers.map((server) => (
        <ServerCard key={server.id} server={server} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
