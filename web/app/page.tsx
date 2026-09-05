import ServerControl from '@/components/ServerControl';
import RconConsole from '@/components/RconConsole';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-950">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
          TailCraft Hub
        </h1>
        <p className="text-zinc-400">Local Minecraft Server Manager</p>
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center">
        <ServerControl />
        <RconConsole />
      </div>
    </main>
  );
}
