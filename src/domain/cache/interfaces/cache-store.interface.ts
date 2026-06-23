import { CacheEntry } from '../models/cache-entry.model';

export interface CacheStore {
  get(key: string): CacheEntry | undefined;
  set(key: string, entry: CacheEntry): void;
  delete(key: string): boolean;
  clear(): void;
  has(key: string): boolean;
  getSize(): number;
  getMemoryUsageBytes(): number;
  entries(): IterableIterator<[string, CacheEntry]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<CacheEntry>;
}
