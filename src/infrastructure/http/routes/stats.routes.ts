import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller';
import { CacheService } from '../../../modules/cache/cache.service';

export const createStatsRoutes = (cacheService: CacheService) => {
  const router = Router();
  const controller = new StatsController(cacheService);
  router.get('/', controller.getStats);
  return router;
};
