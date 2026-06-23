import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';
import { RedisTcpServer } from '../../src/infrastructure/tcp/redis-tcp.server';
import { CommandDispatcher } from '../../src/modules/commands/command-dispatcher.service';
import { CacheService } from '../../src/modules/cache/cache.service';
import { InMemoryCacheRepository } from '../../src/infrastructure/storage/in-memory-cache.repository';
import { getEvictionPolicy } from '../../src/modules/cache/eviction.service';
import { registerConnectionHandlers } from '../../src/modules/commands/handlers/connection.handlers';
import { registerStringHandlers } from '../../src/modules/commands/handlers/string.handlers';
import { registerExpiryHandlers } from '../../src/modules/commands/handlers/expiry.handlers';
import { registerAdminHandlers } from '../../src/modules/commands/handlers/admin.handlers';

describe('TCP Redis Client Integration', () => {
  let server: RedisTcpServer;
  let client: any;

  beforeAll(async () => {
    const store = new InMemoryCacheRepository();
    const cacheService = new CacheService(store, getEvictionPolicy());
    const dispatcher = new CommandDispatcher();
    
    registerConnectionHandlers(dispatcher);
    registerStringHandlers(dispatcher, cacheService);
    registerExpiryHandlers(dispatcher, cacheService);
    registerAdminHandlers(dispatcher, cacheService);

    server = new RedisTcpServer(dispatcher, cacheService);
    await server.start(); // Uses default port from .env.test (6380)

    client = new Redis(6380, '127.0.0.1');
  });

  afterAll(async () => {
    if (client) {
      await client.quit();
    }
    if (server) {
      await server.stop();
    }
  });

  it('should respond to PING', async () => {
    const res = await client.ping();
    expect(res).toBe('PONG');
  });

  it('should SET and GET a value', async () => {
    await client.set('foo', 'bar');
    const res = await client.get('foo');
    expect(res).toBe('bar');
  });
});
