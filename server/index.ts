import { existsSync } from 'node:fs';
import express, { type NextFunction, type Request, type Response } from 'express';

if (existsSync('.env')) process.loadEnvFile('.env');
process.env.FAL_KEY ||= process.env.FAL_AI_API_KEY;

const { createDb } = await import('./db/index.ts');
const { createAuth } = await import('./auth/index.ts');
const { createLogger } = await import('./log.ts');
const { createUploads } = await import('./files.ts');
const { aiRoutes } = await import('./routes/ai.ts');
const { healthRoutes } = await import('./routes/health.ts');
const { logRoutes } = await import('./routes/log.ts');
const { modelsRoutes } = await import('./routes/models.ts');
const { settingsRoutes } = await import('./routes/settings.ts');
const { tripsRoutes } = await import('./routes/trips.ts');

const DATA = process.env.DATA_DIR ?? 'data';
const db = await createDb(DATA);
const logAction = createLogger(DATA, db.events);
void db.events.prune().catch((e) => console.error('events prune failed:', e.message));
const uploads = createUploads(DATA);
const auth = await createAuth(db, logAction);

const app = express();
app.use(express.json({ limit: '5mb' }));
if (auth.middleware) app.use('/api', auth.middleware);
app.use(healthRoutes(db, !!auth.middleware), aiRoutes(logAction, auth.config), tripsRoutes(db), modelsRoutes(db, uploads, logAction), settingsRoutes(db), logRoutes(logAction));
app.use('/uploads', express.static(uploads.dir, { maxAge: '1y', immutable: true }));
const remote = uploads.remote;
if (remote) app.use('/uploads', (req, res) => res.redirect(301, remote(req.path.slice(1))));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist', { index: false }));
  // a stale tab asking for an old hashed chunk must get 404, not index.html served as JS
  app.get(/^(?!\/api|\/assets\/).*/, (_req, res) => res.sendFile('index.html', { root: 'dist', headers: { 'Cache-Control': 'no-cache' } }));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

// express recognises error handlers by their 4 arguments
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  logAction('server.error', { path: req.path, message: err.message });
  res.status(500).json({ error: err.message });
});

const port = Number(process.env.PORT || 5173);
// HOST=0.0.0.0 to open from a phone on the LAN — exposes your API keys to that network
const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => console.log(`→ http://localhost:${port}`));
