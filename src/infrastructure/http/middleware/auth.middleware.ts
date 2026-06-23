import { Request, Response, NextFunction } from 'express';
import { env } from '../../../config/env';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!env.ADMIN_TOKEN) return next();

  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== env.ADMIN_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};
