import { CacheStore } from '../../domain/cache/interfaces/cache-store.interface';
import { CacheEntry } from '../../domain/cache/models/cache-entry.model';

export class InMemoryCacheRepository implements CacheStore {
  private readonly store: Map<string, CacheEntry>;
  private memoryUsageBytes: number = 0;

  constructor() {
    this.store = new Map<string, CacheEntry>();
  }

  get(key: string): CacheEntry | undefined {
    return this.store.get(key);
  }

  set(key: string, entry: CacheEntry): void {
    const existing = this.store.get(key);
    if (existing) {
      this.memoryUsageBytes -= existing.valueSizeBytes;
    }
    
    this.store.set(key, entry);
    this.memoryUsageBytes += entry.valueSizeBytes;
  }

  delete(key: string): boolean {
    const existing = this.store.get(key);
    if (existing) {
      this.memoryUsageBytes -= existing.valueSizeBytes;
      return this.store.delete(key);
    }
    return false;
  }

  clear(): void {
    this.store.clear();
    this.memoryUsageBytes = 0;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  getSize(): number {
    return this.store.size;
  }

  getMemoryUsageBytes(): number {
    return this.memoryUsageBytes;
  }

  entries(): IterableIterator<[string, CacheEntry]> {
    return this.store.entries();
  }

  keys(): IterableIterator<string> {
    return this.store.keys();
  }

  values(): IterableIterator<CacheEntry> {
    return this.store.values();
  }
}
