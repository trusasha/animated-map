import { expect, test, type Page } from '@playwright/test';
import { mapIdle, openHome, prepare, removeTrip, seedTrip, type SeedStop } from './helpers';

const JAPAN: SeedStop[] = Array.from({ length: 25 }, (_, i) => ({
  name: `Stop ${i}`, lng: 130 + i * 0.5, lat: 31 + i * 0.4, ...(i ? { leg: { mode: 'air', figure: 'airplane' } } : {}),
}));

type LngLat = [number, number];
interface TestMap {
  probe(): Promise<{ center: LngLat }>;
  jumpTo(v: { center: LngLat; zoom: number }): void;
  fitTo(points: LngLat[], o: { maxZoom: number; duration: number }): Promise<void>;
}
const testMap = () => (window as unknown as { __ta: { map: TestMap } }).__ta.map;

const center = (page: Page) => page.evaluate(`(${testMap})().probe().then((p) => p.center)`) as Promise<LngLat>;

const near = async (page: Page, [lng0, lat0]: LngLat, deg: number) => {
  const [lng, lat] = await center(page);
  return Math.abs(lng - lng0) < deg && Math.abs(lat - lat0) < deg;
};

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
  await expect.poll(() => near(page, [136, 36], 3), { timeout: 20_000 }).toBe(true);
  expect(errors).toEqual([]);
  await removeTrip(request, trip.id);
});

// from a low zoom the bad flight threw "Invalid LngLat (lng, NaN)"; from zoom 14 it left null matrices and a blank map
for (const start of [{ center: [20, 30], zoom: 1.4 }, { center: [2, 41], zoom: 14 }] as { center: LngLat; zoom: number }[]) {
  test(`an animated fit from zoom ${start.zoom} reaches the route without errors @map @no-phone`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openHome(page);
    await mapIdle(page);
    await page.evaluate(`(${testMap})().jumpTo(${JSON.stringify(start)})`);
    await page.evaluate(`(${testMap})().fitTo([[-9.1, 38.7], [2.17, 41.38]], { maxZoom: 9, duration: 800 })`);
    await expect.poll(() => near(page, [-3.5, 40], 3), { timeout: 10_000 }).toBe(true);
    expect(errors).toEqual([]);
  });
}
