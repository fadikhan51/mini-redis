import { Request, Response } from 'express';
import { CacheService } from '../../../modules/cache/cache.service';

export class StatsController {
  constructor(private cacheService: CacheService) {}

  public getStats = (req: Request, res: Response) => {
    res.status(200).json(this.cacheService.getStats());
  };
}
