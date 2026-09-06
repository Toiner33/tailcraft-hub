import ServerControl from '@/components/ServerControl';
import RconConsole from '@/components/RconConsole';
import DockerLogs from '@/components/DockerLogs';
import ResourceMetrics from '@/components/ResourceMetrics';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-zinc-950">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
          TailCraft Hub
        </h1>
        <p className="text-zinc-400">Local Minecraft Server Manager</p>
      </div>

      {/* Expanded container width to 5xl with generous vertical gap */}
      <div className="w-full max-w-5xl flex flex-col items-center space-y-6">
        <ResourceMetrics />
        <ServerControl />
        <RconConsole />
        <DockerLogs />
      </div>
    </main>
  );
}
