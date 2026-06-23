export interface CacheStats {
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  commandCount: number;
  usedMemoryBytes: number;
  uptimeSeconds: number;
}
