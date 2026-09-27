/**
 * Formats a byte count into a human-readable string (e.g., 4.5 MB, 1.2 GB).
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes === 0) return '0 B';

  const KIB = 1024;
  const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  // Determine the appropriate unit index using base-2 logarithm
  const i = Math.floor(Math.log(bytes) / Math.log(KIB));
  const unitIndex = Math.min(i, UNITS.length - 1);

  const formattedValue = parseFloat((bytes / Math.pow(KIB, unitIndex)).toFixed(decimals));
  return `${formattedValue} ${UNITS[unitIndex]}`;
}