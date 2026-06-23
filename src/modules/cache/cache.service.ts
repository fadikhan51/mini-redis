import { CacheStore } from '../../domain/cache/interfaces/cache-store.interface';
import { CacheStats } from '../../domain/cache/models/cache-stats.model';
import { CacheEntry } from '../../domain/cache/models/cache-entry.model';
import { EvictionPolicy } from '../../domain/cache/interfaces/eviction-policy.interface';
import { now } from '../../helpers/time.helper';
import { matchGlob } from '../../helpers/glob.helper';
import { env } from '../../config/env';
import { ClusterSlotService } from '../cluster/cluster-slot.service';
import { getHashSlot } from '../../helpers/hash-slot.helper';

export class CacheService {
  private stats: Omit<CacheStats, 'usedMemoryBytes' | 'totalKeys' | 'activeKeys' | 'uptimeSeconds'> = {
    expiredKeys: 0,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    commandCount: 0,
  };
  private startTime = now();

  constructor(
    private readonly store: CacheStore,
    private readonly evictionPolicy: EvictionPolicy,
    private readonly clusterSlotService?: ClusterSlotService
  ) {}

  public getStats(): CacheStats {
    const totalKeys = this.store.getSize();
    return {
      ...this.stats,
      totalKeys,
      activeKeys: totalKeys,
      usedMemoryBytes: this.store.getMemoryUsageBytes(),
      uptimeSeconds: Math.floor((now() - this.startTime) / 1000),
    };
  }

  public trackCommand() {
    this.stats.commandCount++;
  }

  private enforceEviction() {
    const evicted = this.evictionPolicy.evict(this.store, env.CACHE_MAX_KEYS, env.CACHE_MAX_MEMORY_BYTES);
    this.stats.evictionCount += evicted.length;
    if (this.clusterSlotService) {
      for (const entry of evicted) {
        this.clusterSlotService.removeKey(entry.slot, entry.key);
      }
    }
  }

  private deleteEntry(key: string, entry: CacheEntry) {
    this.store.delete(key);
    if (this.clusterSlotService) {
      this.clusterSlotService.removeKey(entry.slot, key);
    }
  }

  private isExpired(entry: CacheEntry, currentTime: number): boolean {
    if (entry.expiresAt !== null && entry.expiresAt <= currentTime) {
      return true;
    }
    return false;
  }

  private getActiveEntry(key: string): CacheEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.missCount++;
      return undefined;
    }

    const currentTime = now();
    if (this.isExpired(entry, currentTime)) {
      this.deleteEntry(key, entry);
      this.stats.expiredKeys++;
      this.stats.missCount++;
      return undefined;
    }

    entry.lastAccessedAt = currentTime;
    entry.accessCount++;
    this.stats.hitCount++;
    return entry;
  }

  public get(key: string): Buffer | null {
    const entry = this.getActiveEntry(key);
    return entry ? entry.value : null;
  }

  public set(
    key: string,
    value: Buffer,
    options?: {
      ex?: number;
      px?: number;
      nx?: boolean;
      xx?: boolean;
      keepttl?: boolean;
      get?: boolean;
    }
  ): Buffer | null | 'OK' {
    const currentTime = now();
    const existingEntry = this.store.get(key);
    
    let isExistingExpired = false;
    if (existingEntry && this.isExpired(existingEntry, currentTime)) {
      isExistingExpired = true;
      this.deleteEntry(key, existingEntry);
      this.stats.expiredKeys++;
    }

    const actuallyExists = existingEntry && !isExistingExpired;
    
    if (options?.nx && actuallyExists) return null;
    if (options?.xx && !actuallyExists) return null;

    let previousValue: Buffer | null = null;
    if (options?.get) {
      previousValue = actuallyExists ? existingEntry!.value : null;
    }

    let expiresAt: number | null = null;
    if (options?.keepttl && actuallyExists) {
      expiresAt = existingEntry!.expiresAt;
    } else if (options?.ex !== undefined) {
      expiresAt = currentTime + options.ex * 1000;
    } else if (options?.px !== undefined) {
      expiresAt = currentTime + options.px;
    } else if (env.CACHE_DEFAULT_TTL_MS > 0 && !options?.keepttl) {
      expiresAt = currentTime + env.CACHE_DEFAULT_TTL_MS;
    }

    const newEntry: CacheEntry = {
      key,
      value,
      valueSizeBytes: value.length,
      createdAt: actuallyExists ? existingEntry!.createdAt : currentTime,
      updatedAt: currentTime,
      expiresAt,
      lastAccessedAt: currentTime,
      accessCount: actuallyExists ? existingEntry!.accessCount + 1 : 1,
      version: actuallyExists ? existingEntry!.version + 1 : 1,
      slot: actuallyExists ? existingEntry!.slot : getHashSlot(key)
    };

    this.store.set(key, newEntry);
    if (!actuallyExists && this.clusterSlotService) {
      this.clusterSlotService.addKey(newEntry.slot, key);
    }
    this.enforceEviction();

    return options?.get ? previousValue : 'OK';
  }

  public del(keys: string[]): number {
    let deletedCount = 0;
    const currentTime = now();

    for (const key of keys) {
      const entry = this.store.get(key);
      if (entry) {
        if (this.isExpired(entry, currentTime)) {
          this.deleteEntry(key, entry);
          this.stats.expiredKeys++;
        } else {
          this.deleteEntry(key, entry);
          deletedCount++;
        }
      }
    }
    return deletedCount;
  }

  public exists(keys: string[]): number {
    let count = 0;
    const currentTime = now();
    for (const key of keys) {
      const entry = this.store.get(key);
      if (entry) {
        if (this.isExpired(entry, currentTime)) {
          this.deleteEntry(key, entry);
          this.stats.expiredKeys++;
        } else {
          count++;
        }
      }
    }
    return count;
  }
  
  public expire(key: string, seconds: number): number {
    return this.pexpire(key, seconds * 1000);
  }

  public pexpire(key: string, milliseconds: number): number {
    const entry = this.getActiveEntry(key);
    if (!entry) return 0;

    entry.expiresAt = now() + milliseconds;
    return 1;
  }

  public ttl(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return -2;

    const currentTime = now();
    if (this.isExpired(entry, currentTime)) {
      this.deleteEntry(key, entry);
      this.stats.expiredKeys++;
      return -2;
    }

    if (entry.expiresAt === null) return -1;

    return Math.max(0, Math.round((entry.expiresAt - currentTime) / 1000));
  }

  public pttl(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return -2;

    const currentTime = now();
    if (this.isExpired(entry, currentTime)) {
      this.deleteEntry(key, entry);
      this.stats.expiredKeys++;
      return -2;
    }

    if (entry.expiresAt === null) return -1;

    return Math.max(0, entry.expiresAt - currentTime);
  }

  public persist(key: string): number {
    const entry = this.getActiveEntry(key);
    if (!entry) return 0;

    if (entry.expiresAt === null) return 0;
    entry.expiresAt = null;
    return 1;
  }

  public incrBy(key: string, increment: number): Buffer {
    const entry = this.getActiveEntry(key);
    let num = 0;

    if (entry) {
      const str = entry.value.toString('utf-8');
      if (!/^-?\d+$/.test(str)) {
        throw new Error('ERR value is not an integer or out of range');
      }
      num = parseInt(str, 10);
      if (isNaN(num)) {
         throw new Error('ERR value is not an integer or out of range');
      }
    }

    num += increment;
    const newValue = Buffer.from(num.toString(), 'utf-8');
    
    if (entry) {
      entry.value = newValue;
      entry.valueSizeBytes = newValue.length;
      entry.updatedAt = now();
      entry.version++;
      this.store.set(key, entry);
    } else {
      this.set(key, newValue);
    }

    return newValue;
  }

  public flushDb(): void {
    this.store.clear();
    if (this.clusterSlotService) {
      this.clusterSlotService.clear();
    }
  }

  public dbSize(): number {
    return this.store.getSize();
  }

  public countKeysInSlot(slot: number): number {
    return this.clusterSlotService ? this.clusterSlotService.countKeysInSlot(slot) : 0;
  }

  public getKeysInSlot(slot: number, count: number): string[] {
    return this.clusterSlotService ? this.clusterSlotService.getKeysInSlot(slot, count) : [];
  }

  public keys(pattern: string): string[] {
    const result: string[] = [];
    const currentTime = now();
    for (const [key, entry] of this.store.entries()) {
      if (this.isExpired(entry, currentTime)) {
        this.deleteEntry(key, entry);
        this.stats.expiredKeys++;
      } else if (matchGlob(pattern, key)) {
        result.push(key);
      }
    }
    return result;
  }

  public scan(cursor: number, match?: string, count: number = 10): { newCursor: number, keys: string[] } {
    const allKeys = Array.from(this.store.keys());
    if (cursor >= allKeys.length) {
      return { newCursor: 0, keys: [] };
    }

    const currentTime = now();
    const result: string[] = [];
    let i = cursor;
    let matched = 0;

    for (; i < allKeys.length && matched < count; i++) {
      const key = allKeys[i];
      const entry = this.store.get(key);
      if (entry) {
        if (this.isExpired(entry, currentTime)) {
          this.deleteEntry(key, entry);
          this.stats.expiredKeys++;
        } else {
          if (!match || matchGlob(match, key)) {
            result.push(key);
            matched++;
          }
        }
      }
    }

    return {
      newCursor: i >= allKeys.length ? 0 : i,
      keys: result
    };
  }
}
