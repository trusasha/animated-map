import { readFileSync } from 'node:fs';
import { expect, test, type Page, type Request } from '@playwright/test';
import { stubNet } from '../fixtures/net';

type Model = { id: string; name: string; url: string | null; status: string; task_id: string | null; mode: string | null; pose: unknown };

const CORS = { 'access-control-allow-origin': '*' };
const BOX = readFileSync(new URL('../fixtures/box.glb', import.meta.url));
const BOX_URL = '/e2e-models/box.glb';
const ready = (id: string, name: string, mode: string | null = 'ground'): Model => ({ id, name, url: BOX_URL, status: 'ready', task_id: null, mode, pose: null });

/** in-memory /api/models, /api/config and /api/settings for this page; returns what the app sent */
async function stubServer(page: Page, initial: Model[], figures?: Record<string, string>) {
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

const openFigures = async (page: Page) => {
  await page.goto('/?ui=next&e2e');
  await page.locator('[data-placeholder="app-header"] button', { hasText: 'figures' }).click();
  return page.getByRole('dialog');
};

const card = (dialog: ReturnType<Page['getByRole']>, name: string) => dialog.getByTestId('figures-list').locator('> div').filter({ hasText: name });
const thumbSrc = (dialog: ReturnType<Page['getByRole']>, name: string) => card(dialog, name).locator('img').getAttribute('src');

test.beforeEach(async ({ page }) => {
  await stubNet(page);
  await page.route('**/api/log', (route) => route.fulfill({ json: {}, headers: CORS }));
});

test.describe('figures library', () => {
  test('list shows ready, generating and failed figures', async ({ page }) => {
    await stubServer(page, [
      ready('m1', 'Truck'),
      { ...ready('m2', 'Photo bike', null), url: null, status: 'pending: generation', task_id: 't' },
      { ...ready('m3', 'Bad photo', null), url: null, status: 'failed' },
    ]);
    const dialog = await openFigures(page);
    await expect(card(dialog, 'Truck').getByText('Ready')).toBeVisible();
    await expect(card(dialog, 'Truck').getByText('Travels by: Land')).toBeVisible();
    await expect(card(dialog, 'Photo bike').getByText('Generating…')).toBeVisible();
    await expect(card(dialog, 'Photo bike').getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(card(dialog, 'Bad photo').getByText('Failed')).toBeVisible();
    await expect(card(dialog, 'Bad photo')).toContainText('Couldn’t make a model');
    await expect(card(dialog, 'Truck').locator('img')).toBeVisible();
  });

  test('add a .glb gives a ready card', async ({ page }) => {
    const server = await stubServer(page, []);
    const dialog = await openFigures(page);
    await expect(dialog.getByText('No figures yet')).toBeVisible();
    await dialog.getByRole('button', { name: 'Add figure' }).click();
    await dialog.getByTestId('figure-file').setInputFiles({ name: 'rover.glb', mimeType: 'model/gltf-binary', buffer: BOX });
    await expect(dialog.getByText('model.glb · ready to use right away')).toBeVisible();
    await expect(dialog.getByLabel('Name')).toHaveValue('rover');
    await dialog.getByRole('button', { name: 'Save figure' }).click();
    await expect(card(dialog, 'rover').getByText('Ready')).toBeVisible();
    expect(server.requests('POST')[0].url).toContain('/api/models/upload?name=rover');
  });

  test('add a photo shows Generating, then Ready once the server finishes', async ({ page }) => {
    const server = await stubServer(page, []);
    const dialog = await openFigures(page);
    await dialog.getByRole('button', { name: 'Add figure' }).click();
    await dialog.getByTestId('figure-file').setInputFiles({ name: 'moto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('jpg') });
    await dialog.getByRole('button', { name: 'Make 3D model' }).click();
    await expect(card(dialog, 'moto').getByText('Generating…')).toBeVisible();
    expect(server.requests('POST')[0].url).toContain('/api/models/generate');
    await expect(card(dialog, 'moto').getByText('Ready')).toBeVisible({ timeout: 20_000 });
    expect(server.refreshed()).toBe(true);
  });

  test('editing the pose saves it and changes the thumbnail', async ({ page }) => {
    const server = await stubServer(page, [ready('m1', 'Truck')]);
    const dialog = await openFigures(page);
    await expect(card(dialog, 'Truck').locator('img')).toBeVisible();
    const before = await thumbSrc(dialog, 'Truck');
    await card(dialog, 'Truck').getByRole('button', { name: 'Edit' }).click();
    await expect(dialog.getByTestId('figure-pose-preview')).toBeVisible();
    await dialog.getByRole('button', { name: 'Turn 90°' }).click();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect.poll(() => server.requests('PUT').find((r) => r.url === '/api/models/m1')).toBeTruthy();
    const put = server.requests('PUT').find((r) => r.url === '/api/models/m1')!.body as { pose: { ry: number } };
    expect(put.pose.ry).toBe(90);
    await expect(card(dialog, 'Truck')).toBeVisible();
    await expect.poll(() => thumbSrc(dialog, 'Truck')).not.toBe(before);
  });

  test('delete then Undo never reaches the server', async ({ page }) => {
    const server = await stubServer(page, [ready('m1', 'Truck')]);
    const dialog = await openFigures(page);
    await card(dialog, 'Truck').getByRole('button', { name: 'Delete' }).click();
    await expect(card(dialog, 'Truck')).toHaveCount(0);
    await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();
    await expect(card(dialog, 'Truck')).toBeVisible();
    await page.waitForTimeout(7000);
    expect(server.requests('DELETE')).toHaveLength(0);
    await expect(card(dialog, 'Truck')).toBeVisible();
  });

  test('delete without Undo removes it and resets defaults pointing at it', async ({ page }) => {
    const server = await stubServer(page, [ready('m1', 'Truck'), ready('m2', 'Other')], { ground: `model:${BOX_URL}` });
    const dialog = await openFigures(page);
    await card(dialog, 'Truck').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('status')).toContainText('“Truck” deleted.');
    expect(server.requests('DELETE')).toHaveLength(0);
    await expect.poll(() => server.requests('DELETE').map((r) => r.url), { timeout: 15_000 }).toEqual(['/api/models/m1']);
    await expect.poll(() => (server.requests('PUT').find((r) => r.url === '/api/settings')?.body as { figures: { ground: string } } | undefined)?.figures.ground).toBe('car');
  });

  test('@needs-p3-04 pose edit rebuilds the player trip', async ({ page }) => {
    await stubServer(page, [ready('m1', 'Truck')]);
    await page.goto('/trip/abc?ui=next&e2e');
    await page.evaluate(() => {
      const w = window as unknown as { __ta: { player: { setTrip: (...a: unknown[]) => unknown } }; __setTripCalls: number };
      const original = w.__ta.player.setTrip.bind(w.__ta.player);
      w.__setTripCalls = 0;
      w.__ta.player.setTrip = (...a) => { w.__setTripCalls++; return original(...a); };
    });
    const calls = () => page.evaluate(() => (window as unknown as { __setTripCalls: number }).__setTripCalls);
    const before = await calls();
    await page.locator('[data-placeholder="app-header"] button', { hasText: 'figures' }).click();
    const dialog = page.getByRole('dialog');
    await card(dialog, 'Truck').getByRole('button', { name: 'Edit' }).click();
    await dialog.getByRole('button', { name: 'Turn 90°' }).click();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect.poll(calls).toBe(before + 1);
  });
});
