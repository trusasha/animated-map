import { readFileSync } from 'node:fs';
import type { APIRequestContext, Page } from '@playwright/test';

export type Model = { id: string; name: string; url: string | null; status: string; task_id: string | null; mode: string | null; pose: unknown };

export const CORS = { 'access-control-allow-origin': '*' };
export const BOX = readFileSync(new URL('../../fixtures/box.glb', import.meta.url));
export const BOX_URL = '/e2e-models/box.glb';
export const ready = (id: string, name: string, mode: string | null = 'ground'): Model => ({ id, name, url: BOX_URL, status: 'ready', task_id: null, mode, pose: null });

/** in-memory /api/models, /api/config and /api/settings for this page; returns what the app sent */
export async function stubServer(page: Page, initial: Model[], figures?: Record<string, string>) {
  const list = [...initial];
  const sent: { method: string; url: string; body?: unknown }[] = [];
  const json = (route: Parameters<Parameters<Page['route']>[1]>[0], body: unknown) => route.fulfill({ json: body, headers: CORS });
  let refreshed = false;

  await page.route(`**${BOX_URL}`, (route) => route.fulfill({ body: BOX, contentType: 'model/gltf-binary', headers: CORS }));
  await page.route('**/api/config', (route) => json(route, { openai: false, photo3d: true }));
  await page.route('**/api/settings', (route) => {
    const r = route.request();
    if (r.method() === 'PUT') sent.push({ method: 'PUT', url: '/api/settings', body: r.postDataJSON() });
    return json(route, r.method() === 'PUT' ? r.postDataJSON() : { lang: 'en', theme: 'light', figures });
  });
  await page.route(/\/api\/models(\/[^?]*)?(\?.*)?$/, (route) => {
    const r = route.request();
    const url = new URL(r.url());
    const [, , , id, action] = url.pathname.split('/');
    sent.push({ method: r.method(), url: url.pathname + url.search, body: r.postData() && r.headers()['content-type']?.includes('json') ? r.postDataJSON() : undefined });
    if (r.method() === 'GET') return json(route, list);
    if (id === 'upload') { const m = ready(`m${list.length + 1}`, url.searchParams.get('name')!, url.searchParams.get('mode')); list.unshift(m); return json(route, m); }
    if (id === 'generate') {
      const m: Model = { ...ready(`m${list.length + 1}`, url.searchParams.get('name')!, url.searchParams.get('mode')), url: null, status: 'pending', task_id: 't1' };
      list.unshift(m);
      return json(route, m);
    }
    const i = list.findIndex((m) => m.id === id);
    if (action === 'refresh') {
      refreshed = true;
      list[i] = { ...list[i], url: BOX_URL, status: 'ready' };
      return json(route, list[i]);
    }
    if (r.method() === 'PUT') { list[i] = { ...list[i], ...r.postDataJSON() }; return json(route, list[i]); }
    list.splice(i, 1);
    return json(route, { ok: true });
  });
  return { sent, requests: (method: string) => sent.filter((s) => s.method === method), refreshed: () => refreshed };
}

export const EMPTY_TRIP = { stops: [], style: 'satellite', speed: 1, format: '9:16' };

/** opens a trip the test created, then the Figures dialog from the header overflow menu */
export const openFigures = async (page: Page, request: APIRequestContext) => {
  const trip = await (await request.post('/api/trips', { data: { title: 'Figures trip', data: EMPTY_TRIP } })).json();
  await page.goto(`/trip/${trip.id}?e2e`);
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Your figures' }).click();
  return page.getByRole('dialog');
};

export const card = (dialog: ReturnType<Page['getByRole']>, name: string) => dialog.getByTestId('figures-list').locator('> div').filter({ hasText: name });
