import { describe, it, expect, beforeEach } from 'vitest';
import { CacheService } from '../../src/modules/cache/cache.service';
import { InMemoryCacheRepository } from '../../src/infrastructure/storage/in-memory-cache.repository';
import { getEvictionPolicy } from '../../src/modules/cache/eviction.service';

describe('CacheService', () => {
  let cacheService: CacheService;
  let store: InMemoryCacheRepository;

  beforeEach(() => {
    store = new InMemoryCacheRepository();
    const policy = getEvictionPolicy();
    cacheService = new CacheService(store, policy);
  });

  it('should set and get a value', () => {
    cacheService.set('test', Buffer.from('value'));
    const val = cacheService.get('test');
    expect(val?.toString('utf-8')).toBe('value');
  });

  it('should return null for missing key', () => {
    const val = cacheService.get('missing');
    expect(val).toBeNull();
  });

  it('should handle NX and XX options correctly', () => {
    cacheService.set('test', Buffer.from('v1'), { nx: true });
    expect(cacheService.get('test')?.toString('utf-8')).toBe('v1');

    const resultNx = cacheService.set('test', Buffer.from('v2'), { nx: true });
    expect(resultNx).toBeNull();
    expect(cacheService.get('test')?.toString('utf-8')).toBe('v1');

    const resultXxMissing = cacheService.set('missing', Buffer.from('v3'), { xx: true });
    expect(resultXxMissing).toBeNull();

    const resultXxExists = cacheService.set('test', Buffer.from('v4'), { xx: true });
    expect(resultXxExists).toBe('OK');
    expect(cacheService.get('test')?.toString('utf-8')).toBe('v4');
  });

  it('should delete a key', () => {
    cacheService.set('test', Buffer.from('v1'));
    cacheService.del(['test']);
    expect(cacheService.get('test')).toBeNull();
  });
});
