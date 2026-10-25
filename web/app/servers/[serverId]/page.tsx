import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { ServerDashboardTabs } from '@/components/server-dashboard/ServerDashboardTabs';
import { ServerProvider } from '@/components/server-dashboard/ServerProvider';
import { parseDashboardTab } from '@/lib/dashboardTabs';

interface ServerDashboardPageProps {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ServerDashboardPage({
  params,
  searchParams,
}: ServerDashboardPageProps) {
  const { serverId } = await params;
  const { tab } = await searchParams;
  const defaultTab = parseDashboardTab(Array.isArray(tab) ? tab[0] : tab);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background p-8 text-foreground">
      <div className="w-full max-w-5xl">
        {/* Top header & navigation */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
          <div>
            <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Server Management Hub</h1>
            <p className="font-mono text-xs text-muted-foreground">
              Active Server ID: <span className="font-semibold text-success">{serverId}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/" className={buttonVariants({ variant: 'outline' })}>
              ← Back to Home Menu
            </Link>
          </div>
        </div>

        {/* One shared status poll for every panel inside the provider */}
        <ServerProvider serverId={serverId}>
          <ServerDashboardTabs defaultTab={defaultTab} />
        </ServerProvider>
      </div>
    </main>
  );
}
