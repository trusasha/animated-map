import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { CustomModel } from '../src/types.ts';
import express, { type NextFunction, type Request, type Response } from 'express';

if (existsSync('.env')) process.loadEnvFile('.env');
process.env.FAL_KEY ||= process.env.FAL_AI_API_KEY;

const { db } = await import('./db.ts');
const ai = await import('./ai.ts');

const DATA = process.env.DATA_DIR ?? 'data';
const UPLOADS = `${DATA}/uploads`;
mkdirSync(UPLOADS, { recursive: true });
mkdirSync(`${DATA}/logs`, { recursive: true });
/** one JSON line per user action / server event, for debugging what happened */
const logAction = (type: string, data: object = {}) =>
  appendFileSync(`${DATA}/logs/actions.jsonl`, JSON.stringify({ t: new Date().toISOString(), type, ...data }) + '\n');

const app = express();
app.use(express.json({ limit: '5mb' }));
const raw = express.raw({ type: () => true, limit: '60mb' });
const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

function saveUpload(buf: Buffer, ext: string) {
  const name = `${randomUUID()}.${ext}`;
  writeFileSync(`${UPLOADS}/${name}`, buf);
  return `/uploads/${name}`;
}

app.get('/api/config', (_req, res) => {
  res.json({ openai: !!process.env.OPENAI_API_KEY, photo3d: !!process.env.FAL_KEY });
});

app.get('/api/reverse', wrap(async (req, res) => res.json(await ai.reverse(Number(req.query.lng), Number(req.query.lat)) ?? null)));
app.get('/api/geocode', wrap(async (req, res) => res.json(await ai.geocode(String(req.query.q || '')))));
app.get('/api/trips', wrap(async (_req, res) => res.json(await db.listTrips())));
app.post('/api/trips', wrap(async (req, res) => res.json(await db.createTrip(req.body.title, req.body.data))));
app.get('/api/trips/:id', wrap(async (req, res) => {
  const trip = await db.getTrip(req.params.id as string);
  trip ? res.json(trip) : res.status(404).json({ error: 'not found' });
}));
app.put('/api/trips/:id', wrap(async (req, res) => res.json(await db.updateTrip(req.params.id as string, req.body.title, req.body.data))));
app.delete('/api/trips/:id', wrap(async (req, res) => { await db.deleteTrip(req.params.id as string); res.json({ ok: true }); }));

app.post('/api/voice', raw, wrap(async (req, res) => {
  const text = await ai.transcribe(req.body, req.headers['content-type'] || 'audio/webm');
  res.json({ text });
}));
app.post('/api/parse', wrap(async (req, res) => {
  const text = String(req.body.text || '');
  const plan = await ai.parseTrip(text);
  logAction('server.parse', { text, stops: plan.stops });
  res.json(plan);
}));
app.post('/api/log', (req, res) => { logAction(String(req.body.type || 'unknown'), req.body.data ?? {}); res.json({ ok: true }); });

const modeOf = (mode: unknown) => (['air', 'ground', 'water'] as const).find((m) => m === mode) ?? null;

app.get('/api/models', wrap(async (_req, res) => res.json(await db.listModels())));
app.post('/api/models/upload', raw, wrap(async (req, res) => {
  const url = saveUpload(req.body, 'glb');
  res.json(await db.createModel({ name: String(req.query.name || 'Моя модель'), url, status: 'ready', task_id: null, mode: modeOf(req.query.mode) }));
}));
// ponytail: macOS `sips` only (this app runs on the owner's Mac); swap for sharp/libheif if hosted elsewhere
function heicToJpeg(buf: Buffer) {
  const src = `${tmpdir()}/${randomUUID()}.heic`, out = `${src}.jpg`;
  writeFileSync(src, buf);
  try {
    execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', '2048', src, '--out', out], { stdio: 'ignore' });
    return readFileSync(out);
  } finally { rmSync(src, { force: true }); rmSync(out, { force: true }); }
}

app.post('/api/models/generate', raw, wrap(async (req, res) => {
  const mime = req.headers['content-type'] || 'image/jpeg';
  const heic = /hei[cf]/i.test(mime) || /\.hei[cf]$/i.test(String(req.query.file || ''));
  const taskId = await ai.photoTo3dCreate(heic ? heicToJpeg(req.body) : req.body, heic ? 'image/jpeg' : mime);
  res.json(await db.createModel({ name: String(req.query.name || 'Из фото'), url: null, status: 'pending', task_id: taskId, mode: modeOf(req.query.mode) }));
}));
// polls overlap with the 35 MB GLB download; a second download would swap the url under saved trips
const refreshing = new Set<string>();
app.post('/api/models/:id/refresh', wrap(async (req, res) => {
  const model = await db.getModel(req.params.id as string);
  if (!model?.task_id || model.status === 'ready' || refreshing.has(model.id)) return res.json(model);
  refreshing.add(model.id);
  try { await refresh(model, res); } finally { refreshing.delete(model.id); }
}));
async function refresh(model: CustomModel, res: Response) {
  const s = await ai.photoTo3dStatus(model.task_id!);
  if (s.status === 'FAILED') return res.json(await db.updateModel(model.id, null, 'failed'));
  if (s.glb) {
    // provider URLs expire, keep our own copy
    const glb = await fetch(s.glb);
    if (!glb.ok) throw new Error(`3D download failed: ${glb.status}`);
    const buf = Buffer.from(await glb.arrayBuffer());
    return res.json(await db.updateModel(model.id, saveUpload(buf, 'glb'), 'ready'));
  }
  const status = s.status === 'IN_QUEUE' ? 'pending: в очереди' : 'pending: генерация';
  res.json(await db.updateModel(model.id, null, status));
}
app.put('/api/models/:id', wrap(async (req, res) => {
  const { name, mode, pose } = req.body;
  const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const model = await db.editModel(req.params.id as string, {
    name: String(name || 'Моя модель').slice(0, 80), mode: modeOf(mode),
    pose: pose ? { rx: num(pose.rx, 0), ry: num(pose.ry, 0), rz: num(pose.rz, 0), scale: Math.min(3, Math.max(0.2, num(pose.scale, 1))) } : null,
  });
  model ? res.json(model) : res.status(404).json({ error: 'not found' });
}));
app.delete('/api/models/:id', wrap(async (req, res) => { await db.deleteModel(req.params.id as string); res.json({ ok: true }); }));

app.use('/uploads', express.static(UPLOADS, { maxAge: '1y', immutable: true }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile('index.html', { root: 'dist' }));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  logAction('server.error', { path: req.path, message: err.message });
  res.status(500).json({ error: err.message });
});

const port = Number(process.env.PORT || 5173);
// HOST=0.0.0.0 to open from a phone on the LAN — exposes your API keys to that network
const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => console.log(`→ http://localhost:${port}`));
