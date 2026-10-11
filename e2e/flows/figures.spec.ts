import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
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

const EMPTY_TRIP = { stops: [], style: 'satellite', speed: 1, format: '9:16' };

/** opens a trip the test created, then the Figures dialog from the header overflow menu */
const openFigures = async (page: Page, request: APIRequestContext) => {
  const trip = await (await request.post('/api/trips', { data: { title: 'Figures trip', data: EMPTY_TRIP } })).json();
  await page.goto(`/trip/${trip.id}?e2e`);
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Your figures' }).click();
  return page.getByRole('dialog');
};

const card = (dialog: ReturnType<Page['getByRole']>, name: string) => dialog.getByTestId('figures-list').locator('> div').filter({ hasText: name });

test.beforeEach(async ({ page }) => {
  await stubNet(page);
  await page.route('**/api/log', (route) => route.fulfill({ json: {}, headers: CORS }));
});

test.describe('figures library', () => {
  test('list shows ready, generating and failed figures', async ({ page, request }) => {
    await stubServer(page, [
      ready('m1', 'Truck'),
      { ...ready('m2', 'Photo bike', null), url: null, status: 'pending: generation', task_id: 't' },
      { ...ready('m3', 'Bad photo', null), url: null, status: 'failed' },
    ]);
    const dialog = await openFigures(page, request);
    await expect(card(dialog, 'Truck').getByText('Ready')).toBeVisible();
    await expect(card(dialog, 'Truck').getByText('Travels by: Land')).toBeVisible();
    await expect(card(dialog, 'Photo bike').getByText('Generating…')).toBeVisible();
    await expect(card(dialog, 'Photo bike').getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(card(dialog, 'Bad photo').getByText('Failed')).toBeVisible();
    await expect(card(dialog, 'Bad photo')).toContainText('Couldn’t make a model');
    await expect(card(dialog, 'Truck').locator('img')).toBeVisible();
  });

  test('add a .glb gives a ready card', async ({ page, request }) => {
    const server = await stubServer(page, []);
    const dialog = await openFigures(page, request);
    await expect(dialog.getByText('No figures yet')).toBeVisible();
    await dialog.getByRole('button', { name: 'Add figure' }).click();
    await dialog.getByTestId('figure-file').setInputFiles({ name: 'rover.glb', mimeType: 'model/gltf-binary', buffer: BOX });
    await expect(dialog.getByText('model.glb · ready to use right away')).toBeVisible();
    await expect(dialog.getByLabel('Name')).toHaveValue('rover');
    await dialog.getByRole('button', { name: 'Save figure' }).click();
    await expect(card(dialog, 'rover').getByText('Ready')).toBeVisible();
    expect(server.requests('POST')[0].url).toContain('/api/models/upload?name=rover');
  });

  test('add a photo shows Generating, then Ready once the server finishes', async ({ page, request }) => {
    const server = await stubServer(page, []);
    const dialog = await openFigures(page, request);
    await dialog.getByRole('button', { name: 'Add figure' }).click();
    await dialog.getByTestId('figure-file').setInputFiles({ name: 'moto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('jpg') });
    await dialog.getByRole('button', { name: 'Make 3D model' }).click();
    await expect(card(dialog, 'moto').getByText('Generating…')).toBeVisible();
    expect(server.requests('POST')[0].url).toContain('/api/models/generate');
    await expect(card(dialog, 'moto').getByText('Ready')).toBeVisible({ timeout: 20_000 });
    expect(server.refreshed()).toBe(true);
  });

  test('opening a figure shows a live viewer that survives a drag, and saving keeps the pose', async ({ page, request }) => {
    const server = await stubServer(page, [{ ...ready('m1', 'Truck'), pose: { rx: 0, ry: 90, rz: 0, scale: 1 } }]);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const dialog = await openFigures(page, request);
    await card(dialog, 'Truck').getByRole('button', { name: 'Truck' }).click();
    const canvas = dialog.getByTestId('figure-viewer').locator('canvas');
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    expect(box.width).toBeGreaterThan(50);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 20, { steps: 5 });
    await page.mouse.up();
    await expect(canvas).toBeVisible();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect.poll(() => server.requests('PUT').find((r) => r.url === '/api/models/m1')).toBeTruthy();
    const put = server.requests('PUT').find((r) => r.url === '/api/models/m1')!.body as { pose: { ry: number } };
    expect(put.pose.ry).toBe(90);
    expect(errors).toEqual([]);
  });

  test('orientation editor: drag, ±90° buttons and typed angles edit one pose that saves and reopens', async ({ page, request }) => {
    const server = await stubServer(page, [{ ...ready('m1', 'Truck'), pose: { rx: 0, ry: 0, rz: 0, scale: 1.5 } }]);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const dialog = await openFigures(page, request);
    await card(dialog, 'Truck').getByRole('button', { name: 'Truck' }).click();
    await dialog.getByRole('button', { name: 'Orientation' }).click();
    await expect(dialog.getByRole('heading', { name: 'Orientation' })).toBeVisible();
    const field = (name: string) => dialog.getByRole('textbox', { name, exact: true });
    const save = dialog.getByRole('button', { name: 'Save' });
    await expect(save).toBeDisabled();

    const canvas = dialog.getByTestId('orientation-viewer').locator('canvas');
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect(field('Turn (Y)')).not.toHaveValue('0');
    await expect(save).toBeEnabled();

    await dialog.getByRole('button', { name: 'Reset' }).click();
    for (const name of ['Tilt (X)', 'Turn (Y)', 'Roll (Z)']) await expect(field(name)).toHaveValue('0');
    await dialog.getByRole('button', { name: 'Turn (Y) +90°' }).click();
    await expect(field('Turn (Y)')).toHaveValue('90');
    await field('Tilt (X)').fill('30');
    await field('Tilt (X)').press('Enter');
    await expect(field('Tilt (X)')).toHaveValue('30');
    await expect(field('Turn (Y)')).toHaveValue('90');

    await save.click();
    await expect(dialog.getByRole('heading', { name: 'Edit figure' })).toBeVisible();
    const put = server.requests('PUT').find((r) => r.url === '/api/models/m1')!.body as { pose: unknown };
    expect(put.pose).toEqual({ rx: 30, ry: 90, rz: 0, scale: 1.5 });

    await dialog.getByRole('button', { name: 'Orientation' }).click();
    await expect(field('Tilt (X)')).toHaveValue('30');
    await expect(field('Turn (Y)')).toHaveValue('90');
    await expect(field('Roll (Z)')).toHaveValue('0');
    await dialog.getByRole('button', { name: '← Back' }).click();
    await expect(dialog.getByRole('heading', { name: 'Edit figure' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('delete then Undo never reaches the server', async ({ page, request }) => {
    const server = await stubServer(page, [ready('m1', 'Truck')]);
    const dialog = await openFigures(page, request);
    await card(dialog, 'Truck').getByRole('button', { name: 'Delete' }).click();
    await expect(card(dialog, 'Truck')).toHaveCount(0);
    await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();
    await expect(card(dialog, 'Truck')).toBeVisible();
    await page.waitForTimeout(7000);
    expect(server.requests('DELETE')).toHaveLength(0);
    await expect(card(dialog, 'Truck')).toBeVisible();
  });

  test('delete without Undo removes it and resets defaults pointing at it', async ({ page, request }) => {
    const server = await stubServer(page, [ready('m1', 'Truck'), ready('m2', 'Other')], { ground: `model:${BOX_URL}` });
    const dialog = await openFigures(page, request);
    await card(dialog, 'Truck').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('status')).toContainText('“Truck” deleted.');
    expect(server.requests('DELETE')).toHaveLength(0);
    await expect.poll(() => server.requests('DELETE').map((r) => r.url), { timeout: 15_000 }).toEqual(['/api/models/m1']);
    await expect.poll(() => (server.requests('PUT').find((r) => r.url === '/api/settings')?.body as { figures: { ground: string } } | undefined)?.figures.ground).toBe('car');
  });

  test('@needs-p3-04 size edit rebuilds the player trip', async ({ page, request }) => {
    await stubServer(page, [ready('m1', 'Truck')]);
    const trip = await (await request.post('/api/trips', { data: { title: 'Figures trip', data: EMPTY_TRIP } })).json();
    await page.goto(`/trip/${trip.id}?e2e`);
    await page.evaluate(() => {
      const w = window as unknown as { __ta: { player: { setTrip: (...a: unknown[]) => unknown } }; __setTripCalls: number };
      const original = w.__ta.player.setTrip.bind(w.__ta.player);
      w.__setTripCalls = 0;
      w.__ta.player.setTrip = (...a) => { w.__setTripCalls++; return original(...a); };
    });
    const calls = () => page.evaluate(() => (window as unknown as { __setTripCalls: number }).__setTripCalls);
    const before = await calls();
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Your figures' }).click();
    const dialog = page.getByRole('dialog');
    await card(dialog, 'Truck').getByRole('button', { name: 'Edit' }).click();
    await dialog.getByRole('slider', { name: 'Size' }).press('ArrowRight');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect.poll(calls).toBe(before + 1);
  });
});
