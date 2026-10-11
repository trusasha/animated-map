import express, { type NextFunction, type Request, type Response } from 'express';
import type { Owner } from '../db/index.ts';

export const raw = express.raw({ type: () => true, limit: '60mb' });

export const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

/** set by the auth middleware; null is the single local user when auth is off */
export const ownerOf = (res: Response): Owner => res.locals.owner ?? null;

/** the caller's Supabase token, to act in Storage as that user */
export const tokenOf = (res: Response): string | undefined => res.locals.token;
