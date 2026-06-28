import { db } from "@/lib/db";

/**
 * Formats a byte value into a human-readable string.
 *
 * Examples:
 *   formatBytes(500)      => "500 B"
 *   formatBytes(2048)     => "2.0 KB"
 *   formatBytes(1048576)  => "1.0 MB"
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/**
 * Calculates the total size of all stored files in IndexedDB.
 * Uses the `size` field of each FileItem.
 */
export async function getStoredFilesTotalSize(): Promise<number> {
  const files = await db.files.toArray();
  return files.reduce((total, file) => total + (file.size || 0), 0);
}
