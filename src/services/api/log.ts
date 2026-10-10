import { authHeaders, jsonBody } from './http';

export const log = {
  /** fire-and-forget action log (data/logs/actions.jsonl) */
  log: (type: string, data: object = {}) => {
    const body = jsonBody('POST', { type, data });
    authHeaders().then((auth) => fetch('/api/log', { ...body, headers: { ...body.headers, ...auth }, keepalive: true })).catch(() => {});
  },
};
