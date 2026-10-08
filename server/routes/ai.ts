import { Router } from 'express';
import * as ai from '../ai.ts';
import type { LogAction } from '../log.ts';
import { raw, wrap } from './http.ts';

export const aiRoutes = (logAction: LogAction) => Router()
  .get('/api/config', (_req, res) => {
    res.json({ openai: !!process.env.OPENAI_API_KEY, photo3d: !!process.env.FAL_KEY });
  })
  .get('/api/reverse', wrap(async (req, res) => res.json(await ai.reverse(Number(req.query.lng), Number(req.query.lat)) ?? null)))
  .get('/api/geocode', wrap(async (req, res) => res.json(await ai.geocode(String(req.query.q || '')))))
  .post('/api/voice', raw, wrap(async (req, res) => {
    const text = await ai.transcribe(req.body, req.headers['content-type'] || 'audio/webm');
    res.json({ text });
  }))
  .post('/api/parse', wrap(async (req, res) => {
    const text = String(req.body.text || '');
    const plan = await ai.parseTrip(text);
    logAction('server.parse', { text, stops: plan.stops });
    res.json(plan);
  }));
