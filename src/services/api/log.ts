import { jsonBody } from './http';

export const log = {
  /** fire-and-forget action log (data/logs/actions.jsonl) */
  log: (type: string, data: object = {}) => { fetch('/api/log', { ...jsonBody('POST', { type, data }), keepalive: true }).catch(() => {}); },
};
