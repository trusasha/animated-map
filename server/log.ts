import { appendFileSync, mkdirSync } from 'node:fs';
import type { EventsRepo, Owner } from './db/index.ts';

/** who sent a client event; server events have neither */
export interface LogContext { owner?: Owner; session?: string | null }

export type LogAction = (type: string, data?: object, ctx?: LogContext) => void;

/** a client can't bloat the table: bigger payloads keep only their size */
const MAX_DATA = 8_000;

/**
 * one JSON line per user action / server event, for debugging what happened; with `events` also a row in the
 * database, which /api/health/stats reads
 */
export function createLogger(dataDir: string, events?: EventsRepo): LogAction {
  mkdirSync(`${dataDir}/logs`, { recursive: true });
  return (type, data = {}, ctx = {}) => {
    const t = new Date().toISOString();
    appendFileSync(`${dataDir}/logs/actions.jsonl`, JSON.stringify({ t, type, ...ctx, ...data }) + '\n');
    if (!events) return;
    const json = JSON.stringify(data);
    const row = json.length > MAX_DATA ? { truncated: json.length } : data;
    events.add(ctx.owner ?? null, type.slice(0, 64), ctx.session?.slice(0, 64) ?? null, row).catch((e) => console.error('event not stored:', e.message));
  };
}
