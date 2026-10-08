import { existsSync } from 'node:fs';
import express, { type NextFunction, type Request, type Response } from 'express';

if (existsSync('.env')) process.loadEnvFile('.env');
process.env.FAL_KEY ||= process.env.FAL_AI_API_KEY;

const { createDb } = await import('./db/index.ts');
const { createLogger } = await import('./log.ts');
const { createUploads } = await import('./files.ts');
const { aiRoutes } = await import('./routes/ai.ts');
const { logRoutes } = await import('./routes/log.ts');
const { modelsRoutes } = await import('./routes/models.ts');
const { settingsRoutes } = await import('./routes/settings.ts');
const { tripsRoutes } = await import('./routes/trips.ts');

const DATA = process.env.DATA_DIR ?? 'data';
const db = await createDb(DATA);
const logAction = createLogger(DATA);
const uploads = createUploads(DATA);

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(aiRoutes(logAction), tripsRoutes(db), modelsRoutes(db, uploads), settingsRoutes(db), logRoutes(logAction));
app.use('/uploads', express.static(uploads.dir, { maxAge: '1y', immutable: true }));

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
