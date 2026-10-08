import { expect, test, type Page } from '@playwright/test';
import { mapIdle, openHome, prepare, removeTrip, seedTrip, type SeedStop } from './helpers';

const JAPAN: SeedStop[] = Array.from({ length: 25 }, (_, i) => ({
  name: `Stop ${i}`, lng: 130 + i * 0.5, lat: 31 + i * 0.4, ...(i ? { leg: { mode: 'air', figure: 'airplane' } } : {}),
}));

const center = (page: Page) =>
  page.evaluate(() => (window as unknown as { __ta: { map: { probe(): Promise<{ center: [number, number] }> } } }).__ta.map.probe().then((p) => p.center));

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test('opening a trip from Home after the globe has spun flies the camera to the route @map @no-phone', async ({ page, request }) => {
  test.setTimeout(90_000);
  const trip = await seedTrip(request, { title: `Camera trip ${Date.now()}`, stops: JAPAN });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openHome(page);
  await mapIdle(page);
  await page.waitForTimeout(16_000);
  await page.getByTestId('trip-row').filter({ hasText: trip.title }).getByRole('button').first().click();
  await expect(page.getByTestId('editor-shell')).toBeVisible();
  await expect.poll(async () => {
    const [lng, lat] = await center(page);
    return Math.abs(lng - 136) < 3 && Math.abs(lat - 36) < 3;
  }, { timeout: 20_000 }).toBe(true);
  expect(errors).toEqual([]);
  await removeTrip(request, trip.id);
});
