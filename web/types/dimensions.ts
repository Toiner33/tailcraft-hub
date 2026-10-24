// types/dimensions.ts

export type DimensionId = string; // Now fully dynamic (e.g., "overworld", "nether", "DIM-1", or custom mod folders)

export interface DimensionStats {
  id: DimensionId;          // URL-safe slug or encoded path identifier
  name: string;             // Human-readable display name (e.g., "Overworld", "The Nether")
  folderPath: string;       // Relative path to the dimension folder
  fileCount: number;        // Number of .mca files found
  totalSizeBytes: number;   // Combined size in bytes
  formattedSize: string;    // Human-readable size string
  chunkCount: number;       // Total generated chunks across all MCA files
  lastModified: string | null; // ISO timestamp of latest modification
}

// Type guard for dynamic dimension IDs (accepts any non-empty string)
export function isValidDimensionId(id: unknown): id is DimensionId {
  return typeof id === 'string' && id.trim().length > 0;
}