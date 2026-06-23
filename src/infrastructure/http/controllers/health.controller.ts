import { Request, Response } from 'express';

export let isAppReady = false;
export const setAppReady = (ready: boolean) => { isAppReady = ready; };

export const getLive = (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
};

export const getReady = (req: Request, res: Response) => {
  if (isAppReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'starting' });
  }
};
