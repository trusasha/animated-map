import { Router } from 'express';
import type { LogAction } from '../log.ts';

export const logRoutes = (logAction: LogAction) => Router()
  .post('/api/log', (req, res) => { logAction(String(req.body.type || 'unknown'), req.body.data ?? {}); res.json({ ok: true }); });
