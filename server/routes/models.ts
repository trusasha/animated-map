import { Router, type Response } from 'express';
import type { CustomModel } from '../../src/domain/types.ts';
import * as ai from '../ai.ts';
import type { DbService } from '../db/index.ts';
import { heicToJpeg, type Uploads } from '../files.ts';
import { ownerOf, raw, wrap } from './http.ts';

const modeOf = (mode: unknown) => (['air', 'ground', 'water'] as const).find((m) => m === mode) ?? null;

export function modelsRoutes({ models }: DbService, uploads: Uploads) {
  // polls overlap with the 35 MB GLB download; a second download would swap the url under saved trips
  const refreshing = new Set<string>();

  async function refresh(model: CustomModel, res: Response) {
    const owner = ownerOf(res);
    const s = await ai.photoTo3dStatus(model.task_id!);
    if (s.status === 'FAILED') return res.json(await models.setState(owner, model.id, null, 'failed'));
    if (s.glb) {
      // provider URLs expire, keep our own copy
      const glb = await fetch(s.glb);
      if (!glb.ok) throw new Error(`3D download failed: ${glb.status}`);
      const buf = Buffer.from(await glb.arrayBuffer());
      return res.json(await models.setState(owner, model.id, await uploads.save(buf, 'glb', owner), 'ready'));
    }
    const status = s.status === 'IN_QUEUE' ? 'pending: в очереди' : 'pending: генерация';
    res.json(await models.setState(owner, model.id, null, status));
  }

  return Router()
    .get('/api/models', wrap(async (_req, res) => res.json(await models.list(ownerOf(res)))))
    .post('/api/models/upload', raw, wrap(async (req, res) => {
      const url = await uploads.save(req.body, 'glb', ownerOf(res));
      res.json(await models.create(ownerOf(res), { name: String(req.query.name || 'Моя модель'), url, status: 'ready', task_id: null, mode: modeOf(req.query.mode) }));
    }))
    .post('/api/models/generate', raw, wrap(async (req, res) => {
      const mime = req.headers['content-type'] || 'image/jpeg';
      const heic = /hei[cf]/i.test(mime) || /\.hei[cf]$/i.test(String(req.query.file || ''));
      const taskId = await ai.photoTo3dCreate(heic ? heicToJpeg(req.body) : req.body, heic ? 'image/jpeg' : mime);
      res.json(await models.create(ownerOf(res), { name: String(req.query.name || 'Из фото'), url: null, status: 'pending', task_id: taskId, mode: modeOf(req.query.mode) }));
    }))
    .post('/api/models/:id/refresh', wrap(async (req, res) => {
      const model = await models.get(ownerOf(res), req.params.id as string);
      if (!model?.task_id || model.status === 'ready' || refreshing.has(model.id)) return res.json(model);
      refreshing.add(model.id);
      try { await refresh(model, res); } finally { refreshing.delete(model.id); }
    }))
    .put('/api/models/:id', wrap(async (req, res) => {
      const { name, mode, pose } = req.body;
      const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
      const model = await models.edit(ownerOf(res), req.params.id as string, {
        name: String(name || 'Моя модель').slice(0, 80), mode: modeOf(mode),
        pose: pose ? { rx: num(pose.rx, 0), ry: num(pose.ry, 0), rz: num(pose.rz, 0), scale: Math.min(3, Math.max(0.2, num(pose.scale, 1))) } : null,
      });
      if (model) res.json(model); else res.status(404).json({ error: 'not found' });
    }))
    .delete('/api/models/:id', wrap(async (req, res) => { await models.remove(ownerOf(res), req.params.id as string); res.json({ ok: true }); }));
}
