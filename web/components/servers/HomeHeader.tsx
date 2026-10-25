import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export function HomeHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mb-10 flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
      <div>
        <h1 className="mb-2 text-4xl font-extrabold tracking-tight">TailCraft Hub</h1>
        <p className="text-sm text-muted-foreground">Multi-Tenant Local Minecraft Server Manager</p>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button onClick={onCreate}>
          <Plus data-icon="inline-start" />
          Create New Server
        </Button>
      </div>
    </div>
  );
}
