import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../config/logger';

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, reqId: (req as any).id }, 'HTTP Server Error');
  res.status(500).json({ error: 'Internal Server Error' });
};
