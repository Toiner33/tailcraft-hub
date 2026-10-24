import path from 'path';

// Encodes an absolute dimension root path into a safe API/URL slug (e.g., 'overworld' or 'world--DIM-1')
export function encodeDimensionId(serverDir: string, dimRoot: string, mainWorldDir: string): string {
  if (dimRoot === mainWorldDir) {
    return 'overworld';
  }
  const relativePath = path.relative(serverDir, dimRoot);
  return relativePath.replace(/[\/\\]/g, '--');
}

// Decodes a dimension ID slug back into an absolute directory path
export function decodeDimensionId(serverDir: string, dimensionId: string, mainWorldDir: string): string {
  if (dimensionId === 'overworld') {
    return mainWorldDir;
  }
  const relativePath = dimensionId.replace(/--/g, path.sep);
  return path.join(serverDir, relativePath);
}