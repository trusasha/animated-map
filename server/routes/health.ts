import { Router, type Request } from 'express';
import type { DbService } from '../db/index.ts';
import { wrap } from './http.ts';

const started = Date.now();
const version = process.env.npm_package_version ?? 'dev';
/** what the stats page lists one by one */
const PROBLEMS = ['export.crashed', 'export.error', 'client.error', 'error', 'server.error'];

/** HEALTH_TOKEN guards the stats; without it they are open only while auth is off (the single local user) */
function allowed(req: Request, authOn: boolean, token = process.env.HEALTH_TOKEN) {
  if (token) return req.get('x-health-token') === token || req.query.token === token;
  return !authOn;
}

async function ping(db: DbService) {
  const t = performance.now();
  try {
    await db.query('select 1');
    return { ok: true, ms: Math.round(performance.now() - t) };
  } catch (e) {
    return { ok: false, ms: Math.round(performance.now() - t), error: e instanceof Error ? e.message : String(e) };
  }
}

const rate = (part = 0, whole = 0) => (whole ? Math.round((part / whole) * 1000) / 10 : null);

/** /api/health for uptime monitors (no auth, no data); /api/health/stats for what users ran into */
export const healthRoutes = (db: DbService, authOn: boolean) => Router()
  .get('/api/health', wrap(async (_req, res) => {
    const dbState = await ping(db);
    res.status(dbState.ok ? 200 : 503).json({
      ok: dbState.ok, version, uptimeS: Math.round((Date.now() - started) / 1000), db: dbState,
      memoryMb: Math.round(process.memoryUsage().rss / 1e6),
    });
  }))
  .get('/api/health/stats', wrap(async (req, res) => {
    if (!allowed(req, authOn)) return void res.status(403).json({ error: 'set HEALTH_TOKEN and pass it as ?token= or x-health-token' });
    const hours = Math.round(Math.min(Math.max(Number(req.query.hours) || 24, 1), 24 * 90));
    const counts = await db.events.counts(hours);
    const opened = counts['export.open'] ?? 0, starts = counts['export.start'] ?? 0;
    res.json({
      hours,
      sessions: counts['session.start'] ?? 0,
      export: {
        opened, started: starts, done: counts['export.done'] ?? 0, failed: counts['export.error'] ?? 0, crashed: counts['export.crashed'] ?? 0,
        crashRatePct: rate(counts['export.crashed'], starts), successRatePct: rate(counts['export.done'], starts),
      },
      errors: { client: (counts['client.error'] ?? 0) + (counts.error ?? 0), server: counts['server.error'] ?? 0 },
      counts,
      recentProblems: await db.events.recent(PROBLEMS, 30),
    });
  }));
