import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';
import { RedisTcpServer } from '../../../src/infrastructure/tcp/redis-tcp.server';
import { CommandDispatcher } from '../../../src/modules/commands/command-dispatcher.service';
import { CacheService } from '../../../src/modules/cache/cache.service';
import { InMemoryCacheRepository } from '../../../src/infrastructure/storage/in-memory-cache.repository';
import { getEvictionPolicy } from '../../../src/modules/cache/eviction.service';
import { registerConnectionHandlers } from '../../../src/modules/commands/handlers/connection.handlers';
import { registerStringHandlers } from '../../../src/modules/commands/handlers/string.handlers';
import { registerExpiryHandlers } from '../../../src/modules/commands/handlers/expiry.handlers';
import { registerAdminHandlers } from '../../../src/modules/commands/handlers/admin.handlers';
import { registerClusterHandlers } from '../../../src/modules/commands/handlers/cluster.handlers';
import { ClusterTopologyService } from '../../../src/modules/cluster/cluster-topology.service';
import { ClusterSlotService } from '../../../src/modules/cluster/cluster-slot.service';
import { ClusterRoutingService } from '../../../src/modules/cluster/cluster-routing.service';
import { env } from '../../../src/config/env';

describe('Cluster Node Integration', () => {
  let server: RedisTcpServer;
  let client: any;
  let topologyService: ClusterTopologyService;
  let slotService: ClusterSlotService;

  beforeAll(async () => {
    env.CLUSTER_ENABLED = true;
    env.CLUSTER_NODE_ID = 'test-node-1';
    env.CLUSTER_CONFIG_FILE = './test-nodes.json';

    slotService = new ClusterSlotService();
    const store = new InMemoryCacheRepository();
    const cacheService = new CacheService(store, getEvictionPolicy(), slotService);
    
    topologyService = new ClusterTopologyService();
    const routingService = new ClusterRoutingService(topologyService);
    
    const dispatcher = new CommandDispatcher(routingService);
    
    registerConnectionHandlers(dispatcher);
    registerStringHandlers(dispatcher, cacheService);
    registerExpiryHandlers(dispatcher, cacheService);
    registerAdminHandlers(dispatcher, cacheService);
    registerClusterHandlers(dispatcher, topologyService, slotService);

    server = new RedisTcpServer(dispatcher, cacheService);
    await server.start();

    client = new Redis(6380, '127.0.0.1');
  });

  afterAll(async () => {
    if (client) await client.quit();
    if (server) await server.stop();
    env.CLUSTER_ENABLED = false;
  });

  it('should support CLUSTER INFO', async () => {
    const res = await client.cluster('INFO') as string;
    expect(res).toContain('cluster_state:ok');
    expect(res).toContain('cluster_slots_assigned:16384');
  });

  it('should support CLUSTER NODES', async () => {
    const res = await client.cluster('NODES') as string;
    expect(res).toContain('test-node-1 127.0.0.1');
  });

  it('should support SET/GET for a key mapping to an owned slot', async () => {
    const slot = await client.cluster('KEYSLOT', 'foo') as number;
    topologyService.updateSlots('test-node-1', [slot]);
    
    await client.set('foo', 'bar');
    const res = await client.get('foo');
    expect(res).toBe('bar');
  });

  it('should return MOVED for a key mapping to an unowned slot', async () => {
    const slot = await client.cluster('KEYSLOT', 'not-my-key') as number;
    topologyService.addOrUpdateNode({
      nodeId: 'other-node',
      host: '127.0.0.1',
      redisPort: 7001,
      httpPort: 8001,
      role: 'master',
      replicaOfNodeId: null,
      flags: [],
      status: 'connected',
      slots: [],
      slotRanges: [],
      configEpoch: 0,
      lastPingAt: 0,
      lastPongAt: 0,
      createdAt: 0,
      updatedAt: 0
    });
    topologyService.updateSlots('other-node', [slot]);

    try {
      await client.set('not-my-key', 'value');
      expect.fail('Should have thrown MOVED');
    } catch (err: any) {
      expect(err.message).toContain('MOVED ' + slot);
    }
  });
});
