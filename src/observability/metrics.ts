import { Registry, collectDefaultMetrics, Gauge, Counter } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

export const cacheTotalKeys = new Gauge({
  name: 'mini_redis_total_keys',
  help: 'Total number of keys in the cache',
  registers: [registry],
});

export const cacheUsedMemory = new Gauge({
  name: 'mini_redis_used_memory_bytes',
  help: 'Used memory by cache values in bytes',
  registers: [registry],
});

export const cacheHits = new Counter({
  name: 'mini_redis_cache_hits_total',
  help: 'Total cache hits',
  registers: [registry],
});

export const cacheMisses = new Counter({
  name: 'mini_redis_cache_misses_total',
  help: 'Total cache misses',
  registers: [registry],
});

export const cacheEvictions = new Counter({
  name: 'mini_redis_evictions_total',
  help: 'Total cache evictions due to memory or key limits',
  registers: [registry],
});
