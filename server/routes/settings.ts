import { Router } from 'express';
import type { DbService } from '../db/index.ts';
import { ownerOf, wrap } from './http.ts';

export const settingsRoutes = ({ settings }: DbService) => Router()
  .get('/api/settings', wrap(async (_req, res) => res.json(await settings.get(ownerOf(res)))))
  .put('/api/settings', wrap(async (req, res) => res.json(await settings.save(ownerOf(res), req.body))));
