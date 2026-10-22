import { Router } from 'express';
import type { LogAction } from '../log.ts';
import { ownerOf } from './http.ts';

export const logRoutes = (logAction: LogAction) => Router()
  .post('/api/log', (req, res) => {
    const session = typeof req.body.session === 'string' ? req.body.session : null;
    logAction(String(req.body.type || 'unknown'), req.body.data ?? {}, { owner: ownerOf(res), session });
    res.json({ ok: true });
  });
