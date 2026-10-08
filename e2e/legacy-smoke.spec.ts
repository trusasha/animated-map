import { expect, test } from '@playwright/test';
import { emptyTrips } from './fixtures/api';
import { stubNet } from './fixtures/net';

test.beforeEach(async ({ page }) => {
  await stubNet(page);
  await emptyTrips(page);
});

test.describe('legacy app smoke @map', () => {
  test.describe.configure({ retries: 1 });

  test('boots with a visible map canvas', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.map canvas.maplibregl-canvas')).toBeVisible();
  });

  test('adds a stop through search and shows a segment row', async ({ page }) => {
    await page.goto('/');
    const search = page.getByPlaceholder('Откуда стартуем?');
    await search.fill('Par');
    await page.getByRole('listitem').filter({ hasText: 'Paris, France' }).click();
    await page.getByPlaceholder('Следующая точка…').fill('Ber');
    await page.getByRole('listitem').filter({ hasText: 'Berlin, Germany' }).click();
    await expect(page.locator('.stops > li')).toHaveCount(2);
    await expect(page.locator('.leg-row')).toHaveCount(1);
  });

  test('autosaves the edited trip with a PUT', async ({ page }) => {
    const put = page.waitForRequest((r) => r.method() === 'PUT' && /\/api\/trips\/[^/]+$/.test(r.url()) && r.postDataJSON().data.stops.length > 0);
    await page.goto('/');
    await page.getByPlaceholder('Откуда стартуем?').fill('Par');
    await page.getByRole('listitem').filter({ hasText: 'Paris, France' }).click();
    const body = (await put).postDataJSON();
    expect(body.data.stops[0].name).toBe('Paris');
  });
});
