import { ServerManager } from '@/components/servers/ServerManager';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background p-8 text-foreground">
      <div className="w-full max-w-5xl">
        <ServerManager />
      </div>
    </main>
  );
}
