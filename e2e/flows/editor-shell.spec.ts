import { expect, test, type Page } from '@playwright/test';
import { stubNet } from '../fixtures/net';

const at = (id: string, name: string, lng: number, lat: number, leg?: object) => ({ id, name, lng, lat, ...(leg && { leg }) });
const SEED = [
  at('a', 'Paris', 2.35, 48.85),
  at('b', 'Berlin', 13.4, 52.5, { mode: 'air', figure: 'airplane' }),
  at('c', 'Rome', 12.5, 41.9, { mode: 'ground', figure: 'car' }),
];

type Padding = { top: number; bottom: number; left: number; right: number };
const padding = (page: Page) => page.evaluate(() => (window as unknown as { __ta: { padding?: Padding } }).__ta.padding);
const width = (page: Page) => page.viewportSize()?.width ?? 0;
const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!;
const controls = (page: Page) => box(page, '.maplibregl-ctrl-bottom-right');

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stubNet(page);
  await page.route('**/api/settings', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: { flyKm: 2000 } }) : r.fallback()));
});

async function open(page: Page, request: Parameters<Parameters<typeof test>[2]>[0]['request'], query = '') {
  const trip = await (await request.post('/api/trips', {
    data: { title: 'Shell flow', data: { stops: SEED, style: 'satellite', speed: 1, format: '9:16' } },
  })).json();
  await page.goto(`/trip/${trip.id}?ui=next&e2e${query}`);
  await expect(page.getByTestId('stop-list')).toBeVisible();
  return { done: () => request.delete(`/api/trips/${trip.id}`) };
}

test.describe('editor shell (F12)', () => {
  test('phone: the sheet snaps, the inspector swaps in, the footer stays, a pick collapses it', async ({ page, request }) => {
    test.skip(width(page) >= 700, 'phone only');
    const t = await open(page, request);
    const sheet = page.locator('section[data-snap]');
    const footer = page.getByTestId('sheet-footer');
    await expect(sheet).toHaveAttribute('data-snap', 'collapsed');
    await expect(footer.getByRole('button', { name: 'Превью' })).toBeVisible();
    await expect(footer.getByRole('button', { name: 'Экспорт' })).toBeVisible();

    const grabber = sheet.getByRole('button', { name: 'Свернуть панель' });
    await grabber.focus();
    await page.keyboard.press('ArrowUp');
    await expect(sheet).toHaveAttribute('data-snap', 'full');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(sheet).toHaveAttribute('data-snap', 'peek');
    await expect.poll(async () => (await sheet.boundingBox())!.height).toBeLessThan(140);
    await sheet.getByRole('button', { name: 'Развернуть панель' }).click();
    await expect(sheet).toHaveAttribute('data-snap', 'collapsed');

    // the camera keeps the route above the sheet; the controls sit top-right, clear of it
    await expect.poll(async () => {
      const h = (await sheet.boundingBox())!.height;
      return Math.abs((await padding(page))!.bottom - (h + 16));
    }).toBeLessThan(2);
    const shell = (await page.getByTestId('editor-shell').boundingBox())!;
    await expect.poll(async () => (await controls(page)).y - shell.y).toBeLessThan(20);
    await expect.poll(async () => (await controls(page)).y + (await controls(page)).height).toBeLessThanOrEqual((await sheet.boundingBox())!.y + 1);

    await page.getByTestId('segment-row').first().click();
    const inspector = sheet.getByTestId('segment-inspector');
    await expect(inspector).toBeVisible();
    await expect(inspector.getByRole('button', { name: 'Все точки' })).toBeVisible();
    await expect(page.getByTestId('stop-list')).toHaveCount(0);
    await expect(footer.getByRole('button', { name: 'Превью' })).toBeVisible();
    // focusing a control deep in the inspector must not scroll the page under the header
    await inspector.getByRole('slider', { name: 'Темп' }).focus();
    await expect(page.getByRole('banner')).toBeInViewport();
    expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
    await inspector.getByRole('button', { name: 'Все точки' }).click();
    await expect(page.getByTestId('segment-inspector')).toHaveCount(0);
    await expect(page.getByTestId('stop-list')).toBeVisible();

    await grabber.focus();
    await page.keyboard.press('ArrowUp');
    await expect(sheet).toHaveAttribute('data-snap', 'full');
    await page.getByTestId('stop-row').nth(1).getByRole('button', { name: 'Действия с точкой' }).click();
    await page.getByRole('menuitem', { name: 'Перенести на карте' }).click();
    await expect(sheet).toHaveAttribute('data-snap', 'collapsed');
    await t.done();
  });

  test('tablet: the inspector replaces the route column', async ({ page, request }) => {
    test.skip(width(page) < 700 || width(page) >= 1100, 'tablet only');
    const t = await open(page, request);
    await expect(page.getByTestId('route-column')).toBeVisible();
    await expect.poll(() => padding(page)).toEqual({ top: 50, bottom: 50, left: 380, right: 60 });
    await page.getByTestId('segment-row').first().click();
    const column = page.getByTestId('inspector-column');
    await expect(column.getByTestId('segment-inspector')).toBeVisible();
    await expect(page.getByTestId('route-column')).toHaveCount(0);
    await expect(column.getByRole('button', { name: 'Все точки' })).toBeVisible();
    await column.getByRole('button', { name: 'Все точки' }).click();
    await expect(page.getByTestId('route-column')).toBeVisible();
    await t.done();
  });

  test('tablet: toasts sit in the free map area, not over the column', async ({ page, request }) => {
    test.skip(width(page) < 700 || width(page) >= 1100, 'tablet only');
    const t = await open(page, request, '&crash=video-panel');
    const toaster = page.locator('[aria-live="polite"]').filter({ has: page.getByRole('button') });
    await expect(toaster).toBeVisible();
    const column = (await page.getByTestId('route-column').boundingBox())!;
    expect((await toaster.boundingBox())!.x).toBeGreaterThanOrEqual(column.x + column.width);
    await t.done();
  });

  test('desktop: the inspector floats on the right and the camera and controls make room', async ({ page, request }) => {
    test.skip(width(page) < 1100, 'desktop only');
    const t = await open(page, request);
    await expect.poll(() => padding(page)).toEqual({ top: 60, bottom: 60, left: 390, right: 60 });
    await page.getByTestId('segment-row').first().click();
    const right = page.getByTestId('inspector-column');
    await expect(right.getByTestId('segment-inspector')).toBeVisible();
    await expect(page.getByTestId('route-column')).toBeVisible();
    await expect(right.getByRole('button', { name: 'Все точки' })).toHaveCount(0);
    await expect.poll(() => padding(page)).toEqual({ top: 60, bottom: 60, left: 390, right: 400 });
    const card = (await right.boundingBox())!;
    await expect.poll(async () => { const c = await controls(page); return c.x + c.width; }).toBeLessThanOrEqual(card.x + 1);
    await right.getByRole('button', { name: 'Снять выделение' }).click();
    await expect.poll(() => padding(page)).toEqual({ top: 60, bottom: 60, left: 390, right: 60 });
    await t.done();
  });

  test('phone Home: the globe sits above the card and the controls clear it', async ({ page }) => {
    test.skip(width(page) >= 700, 'phone only');
    await page.goto('/?ui=next&e2e');
    const card = page.getByTestId('home-screen').locator(':scope > div').first();
    await expect(card).toBeVisible();
    await expect.poll(async () => {
      const p = await page.evaluate(() => (window as unknown as { __ta: { map: { getPadding(): Padding } } }).__ta.map.getPadding());
      return Math.abs(p.bottom - (await card.boundingBox())!.height);
    }).toBeLessThan(2);
    await expect.poll(async () => { const c = await controls(page); return c.y + c.height; }).toBeLessThanOrEqual((await card.boundingBox())!.y + 1);
    const host = (await page.getByTestId('map-host').boundingBox())!;
    await expect.poll(async () => (await controls(page)).y - host.y).toBeLessThan(20);
  });
});
