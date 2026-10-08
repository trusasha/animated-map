import { Router } from 'express';
import type { DbService } from '../db/index.ts';
import { wrap } from './http.ts';

export const settingsRoutes = ({ settings }: DbService) => Router()
  .get('/api/settings', wrap(async (_req, res) => res.json(await settings.get())))
  .put('/api/settings', wrap(async (req, res) => res.json(await settings.save(req.body))));
