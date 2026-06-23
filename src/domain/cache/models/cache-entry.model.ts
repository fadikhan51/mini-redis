export interface CacheEntry {
  key: string;
  value: Buffer;
  valueSizeBytes: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null; // null means no expiration
  lastAccessedAt: number;
  accessCount: number;
  version: number;
  slot: number;
}
