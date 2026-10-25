/** The tabs of the server dashboard page. Kept out of any client file so server code can import it. */
export const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'console', label: 'Console' },
  { id: 'config', label: 'Config' },
  { id: 'world', label: 'World' },
  { id: 'backups', label: 'Backups' },
] as const;

export type DashboardTabId = (typeof DASHBOARD_TABS)[number]['id'];

export const DEFAULT_DASHBOARD_TAB: DashboardTabId = 'overview';

/** Turns the `?tab=` value into a valid tab id (unknown or missing -> the default tab). */
export function parseDashboardTab(value: string | undefined): DashboardTabId {
  return DASHBOARD_TABS.find((tab) => tab.id === value)?.id ?? DEFAULT_DASHBOARD_TAB;
}
