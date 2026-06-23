import { env } from './config/env';
import { logger } from './config/logger';
import { InMemoryCacheRepository } from './infrastructure/storage/in-memory-cache.repository';
import { getEvictionPolicy } from './modules/cache/eviction.service';
import { CacheService } from './modules/cache/cache.service';
import { ExpirationService } from './modules/cache/expiration.service';
import { CommandDispatcher } from './modules/commands/command-dispatcher.service';
import { registerConnectionHandlers } from './modules/commands/handlers/connection.handlers';
import { registerStringHandlers } from './modules/commands/handlers/string.handlers';
import { registerExpiryHandlers } from './modules/commands/handlers/expiry.handlers';
import { registerAdminHandlers } from './modules/commands/handlers/admin.handlers';
import { RedisTcpServer } from './infrastructure/tcp/redis-tcp.server';
import { createApp } from './app';
import { setAppReady } from './infrastructure/http/controllers/health.controller';
import { ClusterTopologyService } from './modules/cluster/cluster-topology.service';
import { ClusterSlotService } from './modules/cluster/cluster-slot.service';
import { ClusterRoutingService } from './modules/cluster/cluster-routing.service';
import { registerClusterHandlers } from './modules/commands/handlers/cluster.handlers';
import { ClusterGossipService } from './modules/cluster/cluster-gossip.service';
import { Heartbeat } from './observability/heartbeat';
import { Server } from 'http';

async function bootstrap() {
  logger.info('Starting Mini Redis...');

  const clusterSlotService = env.CLUSTER_ENABLED ? new ClusterSlotService() : undefined;
  const store = new InMemoryCacheRepository();
  const evictionPolicy = getEvictionPolicy();
  const cacheService = new CacheService(store, evictionPolicy, clusterSlotService);

  const expirationService = new ExpirationService(store, env.CACHE_SWEEP_INTERVAL_MS);
  expirationService.start();

  const heartbeat = new Heartbeat(cacheService, env.HEARTBEAT_INTERVAL_MS);
  heartbeat.start();

  let topologyService: ClusterTopologyService | undefined;
  let routingService: ClusterRoutingService | undefined;
  let gossipService: ClusterGossipService | undefined;

  if (env.CLUSTER_ENABLED) {
    topologyService = new ClusterTopologyService();
    routingService = new ClusterRoutingService(topologyService);
    gossipService = new ClusterGossipService(topologyService);
    gossipService.start();
  }

  const dispatcher = new CommandDispatcher(routingService);
  registerConnectionHandlers(dispatcher);
  registerStringHandlers(dispatcher, cacheService);
  registerExpiryHandlers(dispatcher, cacheService);
  registerAdminHandlers(dispatcher, cacheService);

  if (env.CLUSTER_ENABLED && topologyService && clusterSlotService) {
    registerClusterHandlers(dispatcher, topologyService, clusterSlotService);
  }

  const tcpServer = new RedisTcpServer(dispatcher, cacheService);
  await tcpServer.start();

  const app = createApp(cacheService, topologyService, clusterSlotService);
  const httpServer: Server = app.listen(env.HTTP_PORT, env.HTTP_HOST, () => {
    logger.info(`HTTP Server listening on http://${env.HTTP_HOST}:${env.HTTP_PORT}`);
  });

  setAppReady(true);
  logger.info('Mini Redis is ready.');

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    setAppReady(false);
    
    heartbeat.stop();
    expirationService.stop();
    if (gossipService) gossipService.stop();

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    
    await tcpServer.stop();
    
    logger.info('Graceful shutdown completed.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start application');
  process.exit(1);
});
