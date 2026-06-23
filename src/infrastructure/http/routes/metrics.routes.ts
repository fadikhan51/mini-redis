import { Router, Request, Response } from 'express';
import { registry } from '../../../observability/metrics';

const router = Router();
router.get('/', async (req: Request, res: Response) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

export default router;
