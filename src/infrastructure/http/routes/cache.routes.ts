import { Router } from 'express';
import { CacheController } from '../controllers/cache.controller';
import { validateBody } from '../middleware/validate.middleware';
import { cacheRestPutSchema } from '../../../domain/cache/schemas/cache.schema';
import { authMiddleware } from '../middleware/auth.middleware';
import { CacheService } from '../../../modules/cache/cache.service';

export const createCacheRoutes = (cacheService: CacheService) => {
  const router = Router();
  const controller = new CacheController(cacheService);

  router.get('/:key', controller.get);
  router.put('/:key', validateBody(cacheRestPutSchema), controller.put);
  router.delete('/:key', controller.delete);
  router.post('/flush', authMiddleware, controller.flush);

  return router;
};
