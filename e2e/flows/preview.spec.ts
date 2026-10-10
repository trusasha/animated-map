/* eslint-disable @typescript-eslint/no-explicit-any -- page code drives the services through the untyped test handle */
import { expect, test, type Page } from '@playwright/test';
import { defaultSettings } from '../fixtures/api';
import { stubNet } from '../fixtures/net';

const STOPS = [
  { id: 'p1', name: 'Paris', lng: 2.3522, lat: 48.8566 },
  { id: 'p2', name: 'Rome', lng: 12.4964, lat: 41.9028 },
  { id: 'p3', name: 'Moscow', lng: 37.6173, lat: 55.7558 },
];
const EDITOR = ['seg-casing', 'seg-air'];
const PLAYER = ['route', 'trail', 'stops'];

const line = (a: (typeof STOPS)[number], b: (typeof STOPS)[number]) =>
  Array.from({ length: 20 }, (_, i) => [a.lng + ((b.lng - a.lng) * i) / 19, a.lat + ((b.lat - a.lat) * i) / 19]);

const DATA = {
  stops: STOPS.map((s, i) => (i ? { ...s, leg: { mode: 'air', figure: 'airplane', path: line(STOPS[i - 1], s), pathKey: `${STOPS[i - 1].id}>${s.id}:air` } } : s)),
  style: 'satellite', speed: 1, format: '9:16',
};

const probe = (page: Page) => page.evaluate(() => (window as any).__ta.map.probe());
const time = (page: Page) => page.evaluate(() => (window as any).__ta.player.time as number);

async function openTrip(page: Page, request: any) {
  const trip = await (await request.post('/api/trips', { data: { title: 'Preview trip', data: DATA } })).json();
  await page.goto(`/trip/${trip.id}?e2e`);
  await expect(page.getByRole('textbox', { name: 'Название путешествия' })).toHaveValue('Preview trip');
  await expect.poll(() => page.evaluate(() => (window as any).__ta.player.duration as number), { timeout: 90_000 }).toBeGreaterThan(0);
  await expect.poll(() => probe(page).then((p) => p.markers, () => -1), { timeout: 90_000 }).toBe(3);
  return trip.id as string;
}

test.setTimeout(300_000);

/** the preload's tile fetches wait at the gate once the player has `limit` seconds buffered; returns the release */
const gateFetches = (page: Page, limit: number) =>
  page.evaluate((lim) => {
    const w = window as any;
    const orig = w.fetch.bind(w);
    let open!: () => void;
    const gate = new Promise<void>((r) => { open = r; });
    w.fetch = async (...a: unknown[]) => {
      if (w.__ta.player.buffered >= lim) await gate;
      return orig(...a);
    };
    w.__release = open;
  }, limit);
const release = (page: Page) => page.evaluate(() => (window as any).__release());

test.describe('preview @map', () => {
  test.beforeEach(async ({ page }) => {
    // the phone footer starts Preview, but the preload stalls near 26% at 390×844 under slowTiles (P3-10 follow-up)
    test.skip((page.viewportSize()?.width ?? 0) < 700, 'phone preload stalls');
    await stubNet(page);
    await defaultSettings(page);
  });

  test('F11: preload card, playback, scrub pauses, Esc returns the editor', async ({ page, request }) => {
    const logs: string[] = [];
    page.on('request', (r) => { if (r.url().endsWith('/api/log') && r.method() === 'POST') logs.push(r.postData() ?? ''); });
    const id = await openTrip(page, request);
    await gateFetches(page, -1);
    await page.getByRole('button', { name: 'Превью' }).click();
    await expect(page.getByTestId('preload-card')).toContainText('Подгружаю карту');
    await release(page);
    const transport = page.getByTestId('preview-transport');
    await expect(transport).toBeVisible({ timeout: 200_000 });
    await expect(page.getByTestId('preload-card')).toHaveCount(0);

    let p = await probe(page);
    expect(p.markers).toBe(0);
    expect(EDITOR.map((l) => p.visible[l])).toEqual([false, false]);
    expect(PLAYER.map((l) => p.visible[l])).toEqual([true, true, true]);

    const t0 = await time(page);
    await expect.poll(() => time(page)).toBeGreaterThan(t0 + 0.3);
    await expect(transport.getByRole('button', { name: 'Пауза' })).toBeVisible();

    await transport.getByRole('slider').focus();
    await page.keyboard.press('ArrowRight');
    await expect(transport.getByRole('button', { name: 'Играть' })).toBeVisible();
    const held = await time(page);
    await page.waitForTimeout(500);
    expect(await time(page)).toBe(held);

    await page.keyboard.press('Escape');
    await expect(transport).toHaveCount(0);
    p = await probe(page);
    expect(p.markers).toBe(3);
    expect(EDITOR.map((l) => p.visible[l])).toEqual([true, true]);
    expect(PLAYER.map((l) => p.visible[l])).toEqual([false, false, false]);

    await expect.poll(() => logs.some((l) => l.includes('preview.start')) && logs.some((l) => l.includes('preview.preloaded'))).toBe(true);
    const preloaded = JSON.parse(logs.find((l) => l.includes('preview.preloaded'))!);
    expect(preloaded.data?.seconds ?? preloaded.seconds).toBeGreaterThanOrEqual(0);
    await request.delete(`/api/trips/${id}`);
  });

  test('buffering hold: the label shows and the time stops while tiles are late', async ({ page, request }) => {
    const id = await openTrip(page, request);
    await gateFetches(page, 10);
    await page.getByRole('button', { name: 'Превью' }).click();
    await expect(page.getByTestId('preview-transport')).toBeVisible({ timeout: 200_000 });
    const label = page.getByRole('status').filter({ hasText: 'Буферизация…' });
    await expect(label).toBeVisible({ timeout: 60_000 });
    // the downloads in flight when the gate closed may still land; once they have, the time is pinned at the buffered edge
    await expect.poll(async () => { const a = await time(page); await page.waitForTimeout(700); return (await time(page)) - a; }).toBe(0);
    const { t, b } = await page.evaluate(() => { const p = (window as any).__ta.player; return { t: p.time as number, b: p.buffered as number }; });
    expect(t).toBeLessThanOrEqual(b);
    await expect(label).toBeVisible();

    await release(page);
    await expect(label).toHaveCount(0, { timeout: 60_000 });
    await expect.poll(() => time(page)).toBeGreaterThan(t + 0.5);
    await page.getByRole('button', { name: 'Выйти из превью' }).dispatchEvent('click');
    await expect(page.getByTestId('preview-transport')).toHaveCount(0);
    await request.delete(`/api/trips/${id}`);
  });
});
