import fs from 'fs/promises';
import path from 'path';

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

/**
 * Recursively calculates the total size in bytes of a directory.
 */
export async function getFolderSize(dirPath: string): Promise<number> {
  let totalSizeBytes = 0;
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSizeBytes += await getFolderSize(filePath);
      } else if (file.isFile()) {
        const stats = await fs.stat(filePath);
        totalSizeBytes += stats.size;
      }
    }
  } catch {
    // Return 0 if directory is missing or inaccessible
  }
  return totalSizeBytes;
}