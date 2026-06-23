import { Request, Response } from 'express';
import { CacheService } from '../../../modules/cache/cache.service';
import { CacheRestPutBody } from '../../../domain/cache/schemas/cache.schema';

export class CacheController {
  constructor(private cacheService: CacheService) {}

  public get = (req: Request, res: Response) => {
    const key = req.params.key as string;
    const encoding = (req.query.encoding as string) === 'base64' ? 'base64' : 'utf-8';
    
    const value = this.cacheService.get(key);
    if (!value) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    
    res.status(200).json({
      key,
      value: value.toString(encoding as BufferEncoding),
      encoding
    });
  };

  public put = (req: Request, res: Response) => {
    const key = req.params.key as string;
    const body = req.body as CacheRestPutBody;
    
    this.cacheService.set(key, Buffer.from(body.value), { px: body.ttlMs });
    res.status(200).json({ status: 'ok' });
  };

  public delete = (req: Request, res: Response) => {
    const key = req.params.key as string;
    const count = this.cacheService.del([key]);
    res.status(200).json({ deleted: count > 0 });
  };

  public flush = (req: Request, res: Response) => {
    this.cacheService.flushDb();
    res.status(200).json({ status: 'flushed' });
  };
}
