import { Router } from 'express';
import type { DbService } from '../db/index.ts';
import { ownerOf, wrap } from './http.ts';

export const tripsRoutes = ({ trips }: DbService) => Router()
  .get('/api/trips', wrap(async (_req, res) => res.json(await trips.list(ownerOf(res)))))
  .post('/api/trips', wrap(async (req, res) => res.json(await trips.create(ownerOf(res), req.body.title, req.body.data))))
  .get('/api/trips/:id', wrap(async (req, res) => {
    const trip = await trips.get(ownerOf(res), req.params.id as string);
    if (trip) res.json(trip); else res.status(404).json({ error: 'not found' });
  }))
  .put('/api/trips/:id', wrap(async (req, res) => res.json(await trips.update(ownerOf(res), req.params.id as string, req.body.title, req.body.data))))
  .delete('/api/trips/:id', wrap(async (req, res) => { await trips.remove(ownerOf(res), req.params.id as string); res.json({ ok: true }); }));
