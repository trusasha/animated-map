import { authHeaders, jsonBody } from './http';

/** one id per page load: ties a crash report and the events before it to the same visit */
export const SESSION = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const log = {
  /** fire-and-forget action log (data/logs/actions.jsonl and the events table) */
  log: (type: string, data: object = {}) => {
    const body = jsonBody('POST', { type, data, session: SESSION });
    authHeaders().then((auth) => fetch('/api/log', { ...body, headers: { ...body.headers, ...auth }, keepalive: true })).catch(() => {});
  },
};
