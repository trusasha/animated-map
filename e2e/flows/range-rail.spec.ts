import { expect, test, type Page } from '@playwright/test';
import { isPhone, openEditor, prepare, removeTrip, seedTrip, type SeedStop } from './helpers';

const COUNT = 16;
const STOPS: SeedStop[] = Array.from({ length: COUNT }, (_, i) => ({
  name: `Город ${String.fromCharCode(65 + i)}`,
  lng: 2 + i * 1.5,
  lat: 48 + (i % 4),
  ...(i > 0 && { leg: { mode: 'air', figure: 'airplane' } }),
}));
const RANGE = { range: { from: 's0', to: 's3' } };

const endHandle = (page: Page) => page.getByRole('slider', { name: 'Потяните, чтобы изменить конец видео' });
const startHandle = (page: Page) => page.getByRole('slider', { name: 'Потяните, чтобы изменить начало видео' });
const stopRow = (page: Page, i: number) => page.getByTestId('stop-row').nth(i);
const stored = async (page: Page, id: string) => (await (await page.request.get(`/api/trips/${id}`)).json()).data;

/** the element that scrolls the stop list: the Route card on desktop, the sheet content on phone */
const scroller = (page: Page) =>
  page.getByTestId('stop-list').evaluateHandle((el) => {
    for (let p = el.parentElement; p; p = p.parentElement) if (/auto|scroll/.test(getComputedStyle(p).overflowY)) return p;
    return document.scrollingElement!;
  });

async function open(page: Page, request: Parameters<Parameters<typeof test>[2]>[0]['request']) {
  const trip = await seedTrip(request, { stops: STOPS, data: RANGE });
  await openEditor(page, trip.id);
  await expect(page.getByText('В видео войдут точки 1–4.')).toBeVisible();
  await expect(endHandle(page)).toHaveAttribute('aria-valuenow', '3');
  return trip;
}

test.describe('range rail @map', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepare(page);
  });

  test('mouse drags the end handle from stop 4 to stop 10 across segment rows', async ({ page, request }) => {
    test.skip(isPhone(page), 'desktop only');
    const trip = await open(page, request);
    await stopRow(page, 3).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    const a = (await endHandle(page).boundingBox())!;
    const b = (await stopRow(page, 9).boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 40, b.y + 20, { steps: 30 });
    await expect(endHandle(page)).toHaveAttribute('aria-valuenow', '9');
    await page.mouse.up();
    await expect(page.getByText('В видео войдут точки 1–10.')).toBeVisible();
    await expect.poll(async () => (await stored(page, trip.id)).range).toEqual({ from: 's0', to: 's9' });
    await removeTrip(request, trip.id);
  });

  test('dragging past the bottom edge auto-scrolls and clamps to the last stop', async ({ page, request }) => {
    test.skip(isPhone(page), 'desktop only');
    const trip = await open(page, request);
    const box = await scroller(page);
    const before = await box.evaluate((el) => el.scrollTop);
    const edge = await box.evaluate((el) => Math.min(el.getBoundingClientRect().bottom, innerHeight));
    const a = (await endHandle(page).boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2, Math.min(edge + 20, page.viewportSize()!.height - 1), { steps: 20 });
    await expect(endHandle(page)).toHaveAttribute('aria-valuenow', String(COUNT - 1), { timeout: 10_000 });
    expect(await box.evaluate((el) => el.scrollTop)).toBeGreaterThan(before);
    await page.mouse.up();
    await expect(page.getByText(`В видео войдут точки 1–${COUNT}.`)).toBeVisible();
    await expect.poll(async () => (await stored(page, trip.id)).range).toEqual({ from: 's0', to: `s${COUNT - 1}` });
    await removeTrip(request, trip.id);
  });

  test('handles are sliders: arrows step one stop, Home and End jump, start stays before end', async ({ page, request }) => {
    test.skip(isPhone(page), 'desktop only');
    const trip = await open(page, request);
    await endHandle(page).press('End');
    await expect(page.getByText(`В видео войдут точки 1–${COUNT}.`)).toBeVisible();
    await endHandle(page).press('Home');
    await expect(page.getByText('В видео войдут точки 1–2.')).toBeVisible();
    await endHandle(page).press('ArrowDown');
    await expect(page.getByText('В видео войдут точки 1–3.')).toBeVisible();
    await startHandle(page).press('ArrowDown');
    await startHandle(page).press('ArrowDown');
    await expect(page.getByText('В видео войдут точки 2–3.')).toBeVisible();
    await expect(startHandle(page)).toHaveAttribute('aria-valuemax', '1');
    await expect.poll(async () => (await stored(page, trip.id)).range).toEqual({ from: 's1', to: 's2' });
    await removeTrip(request, trip.id);
  });

  test('phone: a finger drags the start handle inside the sheet without moving the sheet', async ({ page, request }) => {
    test.skip(!isPhone(page), 'phone only');
    const trip = await open(page, request);
    const sheet = page.locator('[data-snap]');
    const snap = await sheet.getAttribute('data-snap');
    const a = (await startHandle(page).boundingBox())!;
    const b = (await stopRow(page, 1).boundingBox())!;
    const x = a.x + a.width / 2, y0 = a.y + a.height / 2, y1 = b.y + 20;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', y0);
    for (let k = 1; k <= 20; k++) {
      await touch('touchMove', y0 + ((y1 - y0) * k) / 20);
      await page.waitForTimeout(16);
    }
    await expect(startHandle(page)).toHaveAttribute('aria-valuenow', '1');
    await expect(sheet).not.toHaveAttribute('data-dragging');
    await touch('touchEnd', y1);
    await expect(page.getByText('В видео войдут точки 2–4.')).toBeVisible();
    await expect(sheet).toHaveAttribute('data-snap', snap!);
    await expect.poll(async () => (await stored(page, trip.id)).range).toEqual({ from: 's1', to: 's3' });
    await removeTrip(request, trip.id);
  });
});
