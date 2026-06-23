import { CacheStore } from './cache-store.interface';
import { CacheEntry } from '../models/cache-entry.model';

export interface EvictionPolicy {
  evict(store: CacheStore, maxKeys: number, maxMemoryBytes: number): CacheEntry[];
}
