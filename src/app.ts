import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { requestIdMiddleware } from './infrastructure/http/middleware/request-id.middleware';
import { errorMiddleware } from './infrastructure/http/middleware/error.middleware';

import healthRoutes from './infrastructure/http/routes/health.routes';
import metricsRoutes from './infrastructure/http/routes/metrics.routes';
import { createCacheRoutes } from './infrastructure/http/routes/cache.routes';
import { createStatsRoutes } from './infrastructure/http/routes/stats.routes';
import { createClusterRoutes } from './infrastructure/http/routes/cluster.routes';
import { CacheService } from './modules/cache/cache.service';
import { ClusterTopologyService } from './modules/cluster/cluster-topology.service';
import { ClusterSlotService } from './modules/cluster/cluster-slot.service';

export const createApp = (
  cacheService: CacheService,
  topologyService?: ClusterTopologyService,
  slotService?: ClusterSlotService
) => {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(express.json({ limit: '5mb' }));
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({
        reqId: (req as any).id,
      }),
    })
  );

  // Routes
  app.use('/health', healthRoutes);
  app.use('/metrics', metricsRoutes);
  app.use('/v1/cache', createCacheRoutes(cacheService));
  app.use('/v1/stats', createStatsRoutes(cacheService));
  app.use('/v1/cluster', createClusterRoutes(topologyService, slotService));
  app.use('/internal/cluster', createClusterRoutes(topologyService, slotService));

  // Error handling
  app.use(errorMiddleware);

  return app;
};
