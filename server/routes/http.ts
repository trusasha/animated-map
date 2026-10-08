import express, { type NextFunction, type Request, type Response } from 'express';

export const raw = express.raw({ type: () => true, limit: '60mb' });

export const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);
