import { expect, test, type Page } from '@playwright/test';
import { stubNet } from '../fixtures/net';

const EMPTY = { stops: [], style: 'satellite', speed: 1, format: '9:16' };
const at = (id: string, name: string, lng: number, lat: number, leg?: object) => ({ id, name, lng, lat, ...(leg && { leg }) });
const SEED = [
  at('a', 'Paris', 2.35, 48.85),
  at('b', 'Berlin', 13.4, 52.5, { mode: 'air', figure: 'airplane', speed: 2 }),
  at('c', 'Rome', 12.5, 41.9, { mode: 'ground', figure: 'car' }),
];

type Logged = { type: string; data: Record<string, unknown> };

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stubNet(page);
  await page.route('**/api/settings', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: { flyKm: 2000 } }) : r.fallback()));
});

async function open(page: Page, request: Parameters<Parameters<typeof test>[2]>[0]['request'], stops: object[]) {
  const logged: Logged[] = [];
  await page.route('**/api/log', async (r) => { logged.push(r.request().postDataJSON()); await r.fulfill({ json: {} }); });
  const trip = await (await request.post('/api/trips', { data: { title: 'Route flow', data: { ...EMPTY, stops } } })).json();
  await page.goto(`/trip/${trip.id}?ui=next&e2e`);
  const stored = async () => (await (await request.get(`/api/trips/${trip.id}`)).json()).data;
  return { id: trip.id as string, logged, stored, done: () => request.delete(`/api/trips/${trip.id}`) };
}

const addPlace = async (page: Page, query: string) => {
  const box = page.getByRole('combobox', { name: /Откуда стартуем|Следующая точка/ });
  await box.fill(query);
  await expect(page.getByRole('option').first()).toBeVisible();
  await box.press('Enter');
};
const row = (page: Page, name: string) => page.getByTestId('stop-row').filter({ hasText: name });

test.describe('route panel @map', () => {
  test.beforeEach(({ page }, info) => {
    test.skip((page.viewportSize()?.width ?? 0) < 700 && !info.title.startsWith('phone'), 'row actions need hover: desktop only');
  });

  test('F2: search adds stops with Enter, segments show Building… then built', async ({ page, request }) => {
    let release = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    await page.route(/router\.project-osrm\.org/, async (route) => { await gate; await route.fallback(); });
    const t = await open(page, request, []);
    await expect(page.getByRole('heading', { name: 'Откуда начинается путешествие?' })).toBeVisible();
    await addPlace(page, 'Par');
    await expect(row(page, 'Paris')).toBeVisible();
    await expect(row(page, 'Paris')).toContainText('France');
    await addPlace(page, 'Ber');
    await expect(page.getByTestId('stop-row')).toHaveCount(2);
    await expect(page.getByTestId('segment-row')).toContainText('Строю…');
    release();
    await expect(page.getByText('Строю…')).toHaveCount(0);
    await expect(page.getByTestId('segment-row')).toContainText('Земля · Машина');
    await expect.poll(async () => (await t.stored()).stops[1]?.leg?.path?.length).toBeGreaterThan(2);
    expect(t.logged.filter((l) => l.type === 'stop.add').map((l) => l.data.name)).toEqual(['Paris', 'Berlin']);
    await t.done();
  });

  test('search says when nothing matches', async ({ page, request }) => {
    const t = await open(page, request, []);
    await page.getByRole('combobox', { name: 'Откуда стартуем?' }).fill('zzz');
    await expect(page.getByText('Ничего не нашлось по запросу «zzz».')).toBeVisible();
    await t.done();
  });

  test('F3: deleting the middle stop shows Undo, which restores the identical trip', async ({ page, request }) => {
    const t = await open(page, request, SEED);
    await expect(page.getByText('Строю…')).toHaveCount(0);
    await expect.poll(async () => (await t.stored()).stops[2].leg.path?.length).toBeGreaterThan(1);
    const before = await t.stored();
    await row(page, 'Berlin').hover();
    await row(page, 'Berlin').getByRole('button', { name: 'Удалить точку' }).click();
    await expect(page.getByTestId('stop-row')).toHaveCount(2);
    await expect(page.getByRole('status').filter({ hasText: 'Точка «Berlin» удалена.' })).toBeVisible();
    await page.getByRole('button', { name: 'Отменить' }).click();
    await expect(page.getByTestId('stop-row')).toHaveCount(3);
    await expect.poll(t.stored).toEqual(before);
    expect(t.logged.map((l) => l.type)).toContain('stop.remove');
    await t.done();
  });

  test('F4: reorder keeps segment settings by position', async ({ page, request }) => {
    const t = await open(page, request, SEED);
    await expect(page.getByText('Строю…')).toHaveCount(0);
    await expect(page.getByTestId('segment-row').first()).toContainText('×2');
    await row(page, 'Berlin').hover();
    await row(page, 'Berlin').getByRole('button', { name: 'Выше' }).click();
    await expect(page.getByTestId('stop-row').first()).toContainText('Berlin');
    await expect(page.getByTestId('segment-row').first()).toContainText('Воздух · Самолёт');
    await expect(page.getByTestId('segment-row').first()).toContainText('×2');
    await expect(page.getByTestId('segment-row').last()).toContainText('Земля · Машина');
    await expect.poll(async () => (await t.stored()).stops.map((s: { name: string }) => s.name)).toEqual(['Berlin', 'Paris', 'Rome']);
    expect(t.logged.map((l) => l.type)).toContain('stop.reorder');
    await t.done();
  });

  test('range rail sets the video range and Use whole route clears it', async ({ page, request }) => {
    const t = await open(page, request, SEED);
    await expect(page.getByText('В видео войдёт весь маршрут.')).toBeVisible();
    await page.getByRole('slider', { name: 'Потяните, чтобы изменить конец видео' }).press('ArrowUp');
    await expect(page.getByText('В видео войдут точки 1–2.')).toBeVisible();
    await expect.poll(async () => (await t.stored()).range).toEqual({ from: 'a', to: 'b' });
    await page.getByRole('button', { name: 'Весь маршрут' }).click();
    await expect(page.getByText('В видео войдёт весь маршрут.')).toBeVisible();
    await expect.poll(async () => (await t.stored()).range).toBeUndefined();
    expect(t.logged.filter((l) => l.type === 'range.set')).toHaveLength(2);
    await t.done();
  });

  test('phone: stop actions live in the ⋯ menu', async ({ page, request }) => {
    test.skip((page.viewportSize()?.width ?? 0) >= 700, 'phone only');
    const t = await open(page, request, SEED);
    await page.getByTestId('stop-row').first().getByRole('button', { name: 'Действия с точкой' }).click();
    await expect(page.getByRole('menuitem', { name: 'Удалить точку' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Перенести на карте' })).toBeVisible();
    await t.done();
  });
});
