import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { CacheService } from '../../src/modules/cache/cache.service';
import { InMemoryCacheRepository } from '../../src/infrastructure/storage/in-memory-cache.repository';
import { getEvictionPolicy } from '../../src/modules/cache/eviction.service';

describe('HTTP API Integration', () => {
  let app: any;
  let cacheService: CacheService;

  beforeAll(() => {
    const store = new InMemoryCacheRepository();
    cacheService = new CacheService(store, getEvictionPolicy());
    app = createApp(cacheService);
  });

  it('GET /health/live should return ok', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('PUT and GET /v1/cache/:key should work', async () => {
    const putRes = await request(app)
      .put('/v1/cache/mykey')
      .send({ value: 'myvalue', ttlMs: 1000 });
    
    expect(putRes.status).toBe(200);

    const getRes = await request(app).get('/v1/cache/mykey');
    expect(getRes.status).toBe(200);
    expect(getRes.body.value).toBe('myvalue');
  });

  it('GET /v1/cache/:key should return 404 if missing', async () => {
    const getRes = await request(app).get('/v1/cache/missing');
    expect(getRes.status).toBe(404);
  });

  it('DELETE /v1/cache/:key should remove the key', async () => {
    await request(app).put('/v1/cache/delkey').send({ value: 'todelete' });
    const delRes = await request(app).delete('/v1/cache/delkey');
    expect(delRes.status).toBe(200);
    expect(delRes.body.deleted).toBe(true);

    const getRes = await request(app).get('/v1/cache/delkey');
    expect(getRes.status).toBe(404);
  });

  it('GET /v1/stats should return cache statistics', async () => {
    const statsRes = await request(app).get('/v1/stats');
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.totalKeys).toBeDefined();
    expect(statsRes.body.hitCount).toBeDefined();
  });
});
