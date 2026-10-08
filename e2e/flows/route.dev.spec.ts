import { expect, test } from '@playwright/test';
import { stubNet } from '../fixtures/net';

const EMPTY = { stops: [], style: 'satellite', speed: 1, format: '9:16' };
const SEED = [
  { id: 'a', name: 'Rome', lng: 12.5, lat: 41.9 },
  { id: 'b', name: 'Berlin', lng: 13.4, lat: 52.5, leg: { mode: 'ground', figure: 'car' } },
  { id: 'c', name: 'Oslo', lng: 10.7, lat: 59.9, leg: { mode: 'air', figure: 'airplane' } },
];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stubNet(page);
  await page.route('**/api/settings', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: {} }) : r.fallback()));
});

test('F6: Move the first stop on the map; Esc cancels; click moves and renames from the reverse geocode', async ({ page, request }) => {
  const logged: { type: string }[] = [];
  await page.route('**/api/log', async (r) => { logged.push(r.request().postDataJSON()); await r.fulfill({ json: {} }); });
  const trip = await (await request.post('/api/trips', { data: { title: 'Move flow', data: { ...EMPTY, stops: SEED } } })).json();
  await page.goto(`/route-harness.html?trip=${trip.id}`);
  const first = page.getByTestId('stop-row').first();
  await first.hover();
  await first.getByRole('button', { name: 'Перенести', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Нажмите на карту, чтобы поставить «Rome»' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Нажмите на карту, чтобы поставить «Rome»')).toHaveCount(0);

  await first.hover();
  await first.getByRole('button', { name: 'Перенести', exact: true }).click();
  await page.mouse.click(900, 450);
  await expect(first).toContainText('Paris');
  await expect(first).toContainText('France');
  const stored = async () => (await (await request.get(`/api/trips/${trip.id}`)).json()).data.stops[0];
  await expect.poll(async () => (await stored()).name).toBe('Paris');
  const s = await stored();
  expect(s.lng).not.toBe(12.5);
  expect(s.sub).toBe('France');
  expect(logged.map((l) => l.type)).toContain('stop.move');
  await request.delete(`/api/trips/${trip.id}`);
});

test('map binding: segment click selects, empty click deselects, marker count follows the stops', async ({ page, request }) => {
  const trip = await (await request.post('/api/trips', { data: { title: 'Map flow', data: { ...EMPTY, stops: SEED } } })).json();
  await page.goto(`/route-harness.html?trip=${trip.id}`);
  await expect(page.getByText('Строю…')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ta: { map: { probe(): Promise<{ markers: number }> } } }).__ta.map.probe().then((p) => p.markers))).toBe(3);
  await page.getByTestId('segment-row').first().click();
  await expect(page.getByTestId('selected')).toHaveText('0');
  await page.getByTestId('segment-row').first().click();
  await expect(page.getByTestId('selected')).toHaveText('null');
  await request.delete(`/api/trips/${trip.id}`);
});
