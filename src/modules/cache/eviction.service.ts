import { EvictionPolicy } from '../../domain/cache/interfaces/eviction-policy.interface';
import { CacheStore } from '../../domain/cache/interfaces/cache-store.interface';
import { env } from '../../config/env';
import { CacheEntry } from '../../domain/cache/models/cache-entry.model';

export class LruEvictionPolicy implements EvictionPolicy {
  evict(store: CacheStore, maxKeys: number, maxMemoryBytes: number): CacheEntry[] {
    const evicted: CacheEntry[] = [];

    if (store.getSize() <= maxKeys && store.getMemoryUsageBytes() <= maxMemoryBytes) {
      return [];
    }

    const SAMPLE_SIZE = 5;

    while (store.getSize() > maxKeys || store.getMemoryUsageBytes() > maxMemoryBytes) {
      const keys = Array.from(store.keys());
      if (keys.length === 0) break;
      
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (let i = 0; i < Math.min(SAMPLE_SIZE, keys.length); i++) {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const entry = store.get(randomKey);
        if (entry && entry.lastAccessedAt < oldestTime) {
          oldestTime = entry.lastAccessedAt;
          oldestKey = randomKey;
        }
      }

      if (oldestKey) {
        const entry = store.get(oldestKey);
        if (entry) {
          store.delete(oldestKey);
          evicted.push(entry);
        }
      } else {
        break;
      }
    }

    return evicted;
  }
}

export class NoEvictionPolicy implements EvictionPolicy {
  evict(store: CacheStore, maxKeys: number, maxMemoryBytes: number): CacheEntry[] {
    if (store.getSize() > maxKeys || store.getMemoryUsageBytes() > maxMemoryBytes) {
      throw new Error("OOM command not allowed when used memory > 'maxmemory'.");
    }
    return [];
  }
}

export const getEvictionPolicy = (): EvictionPolicy => {
  if (env.CACHE_EVICTION_POLICY === 'noeviction') {
    return new NoEvictionPolicy();
  }
  return new LruEvictionPolicy();
};
