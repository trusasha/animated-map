import { appendFileSync, mkdirSync } from 'node:fs';

export type LogAction = (type: string, data?: object) => void;

/** one JSON line per user action / server event, for debugging what happened */
export function createLogger(dataDir: string): LogAction {
  mkdirSync(`${dataDir}/logs`, { recursive: true });
  return (type, data = {}) =>
    appendFileSync(`${dataDir}/logs/actions.jsonl`, JSON.stringify({ t: new Date().toISOString(), type, ...data }) + '\n');
}
