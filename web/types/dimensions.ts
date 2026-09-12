// types/dimensions.ts

export type DimensionId = 'overworld' | 'nether' | 'end';

export interface DimensionConfig {
  id: DimensionId;
  name: string;
  subPath: string; // Relative path inside the server data volume
}

export interface DimensionStats {
  id: DimensionId;
  name: string;
  folderPath: string;
  fileCount: number;
  totalSizeBytes: number;
  formattedSize: string;
  chunkCount: number;
  lastModified: string | null;
}

// Single Source of Truth for all dimensions across backend & frontend
export const DIMENSIONS: readonly DimensionConfig[] = [
  { id: 'overworld', name: 'Overworld', subPath: 'world/region' },
  { id: 'nether', name: 'The Nether', subPath: 'world/DIM-1/region' },
  { id: 'end', name: 'The End', subPath: 'world/DIM1/region' },
] as const;

// Type guard to validate whether an unknown string is a valid DimensionId
export function isValidDimensionId(id: unknown): id is DimensionId {
  return typeof id === 'string' && DIMENSIONS.some((d) => d.id === id);
}

// Helper function using strict DimensionId
export function getDimensionSubPath(dimensionId: DimensionId): string {
  const config = DIMENSIONS.find((d) => d.id === dimensionId);
  return config!.subPath;
}