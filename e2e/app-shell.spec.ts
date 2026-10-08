import { expect, test, type Page } from '@playwright/test';
import { defaultSettings } from './fixtures/api';
import { stubNet } from './fixtures/net';

type Entry = { type: string; data: Record<string, unknown> };
const logged: Record<string, Entry[]> = {};

test.beforeEach(async ({ page }, info) => {
  await stubNet(page);
  await defaultSettings(page);
  const entries: Entry[] = (logged[info.testId] = []);
  await page.route('**/api/log', async (route) => {
    entries.push(route.request().postDataJSON());
    await route.fulfill({ json: {} });
  });
});

const ta = (page: Page) => page.evaluate(() => (window as unknown as { __ta: { padding?: { left: number; right: number } } }).__ta.padding);

test.describe('app shell @map', () => {
  test('Home renders the shell with the shared map', async ({ page }) => {
    await page.goto('/?ui=next&e2e');
    await expect(page.getByTestId('map-host').locator('canvas.maplibregl-canvas')).toBeVisible();
    await expect(page.locator('[data-placeholder="app-header"]')).toBeVisible();
    await expect(page.locator('[data-placeholder="home-screen"]')).toBeVisible();
    await expect(page.locator('[data-placeholder="route-panel"]')).toHaveCount(0);
    expect(await page.evaluate(() => Object.keys((window as unknown as { __ta: object }).__ta))).toEqual(expect.arrayContaining(['map', 'player']));
  });

  test('trip route mounts every editor placeholder and the map survives navigation', async ({ page }) => {
    await page.goto('/?ui=next&e2e');
    const canvas = page.getByTestId('map-host').locator('canvas.maplibregl-canvas');
    await canvas.evaluate((el) => { (el as HTMLElement).dataset.keep = '1'; });
    await page.locator('[data-placeholder="home-screen"] button').click();
    await expect(page).toHaveURL(/\/trip\/new\?ui=next&e2e$/);
    for (const name of ['route-panel', 'video-panel']) await expect(page.locator(`[data-placeholder="${name}"]`)).toBeVisible();
    await expect(canvas).toHaveAttribute('data-keep', '1');
    await page.goBack();
    await expect(page.locator('[data-placeholder="home-screen"]')).toBeVisible();
  });

  test('deep link /trip/:id loads, selection mounts the inspector and moves the camera padding', async ({ page }) => {
    await page.goto('/trip/abc?ui=next&e2e');
    await expect(page.getByTestId('editor-shell')).toBeVisible();
    const before = await expect.poll(() => ta(page)).toBeTruthy().then(() => ta(page));
    await page.locator('[data-placeholder="route-panel"] button').click();
    await expect(page.locator('[data-placeholder="segment-inspector"]')).toBeVisible();
    await expect(page.locator('[data-placeholder="figure-picker"]')).toBeVisible();
    const after = await ta(page);
    const phone = (page.viewportSize()?.width ?? 0) < 700;
    if (phone) await expect(page.locator('[data-placeholder="route-panel"]')).toHaveCount(0);
    else expect(after!.right).toBeGreaterThan(before!.right - 1);
    await page.locator('[data-placeholder="segment-inspector"] button').click();
    await expect(page.locator('[data-placeholder="segment-inspector"]')).toHaveCount(0);
  });

  test('preview and dialogs open from their slots', async ({ page }) => {
    await page.goto('/trip/abc?ui=next&e2e');
    await page.locator('[data-placeholder="app-header"] button', { hasText: 'preview' }).click();
    await expect(page.locator('[data-placeholder="preview-transport"]')).toBeVisible();
    await expect(page.locator('[data-placeholder="route-panel"]')).toHaveCount(0);
    expect(await ta(page)).toEqual(expect.objectContaining({ left: 0, right: 0 }));
    await page.locator('[data-placeholder="preview-transport"] button').click();
    await expect(page.locator('[data-placeholder="route-panel"]')).toBeVisible();
    for (const [button, name] of [['export', 'export-dialog'], ['figures', 'figures-dialog']]) {
      await page.locator('[data-placeholder="app-header"] button', { hasText: button }).click();
      await expect(page.locator(`[data-placeholder="${name}"]`)).toBeVisible();
      await page.locator(`[data-placeholder="${name}"] button`).click();
      await expect(page.locator(`[data-placeholder="${name}"]`)).toHaveCount(0);
    }
  });

  test('theme and language are saved by a PUT and a settings.change log', async ({ page }, info) => {
    await page.goto('/?ui=next&e2e');
    await page.locator('[data-placeholder="app-header"] button', { hasText: 'settings' }).click();
    const put = page.waitForRequest((r) => r.method() === 'PUT' && r.url().endsWith('/api/settings') && r.postDataJSON().lang === 'en');
    const dialog = page.locator('[data-placeholder="settings-dialog"]');
    await dialog.getByRole('button', { name: 'theme' }).click();
    await dialog.getByRole('button', { name: 'lang' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const body = (await put).postDataJSON();
    expect(body).toMatchObject({ theme: 'dark', lang: 'en' });
    await expect.poll(() => logged[info.testId].filter((e) => e.type === 'settings.change').length).toBeGreaterThan(0);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  });

  test('an error thrown in a placeholder is caught, toasted and logged; siblings stay', async ({ page }, info) => {
    await page.goto('/trip/abc?ui=next&e2e&crash=route-panel');
    await expect(page.getByRole('alert')).toContainText('route-panel crashed');
    await expect(page.locator('[data-placeholder="video-panel"]')).toBeVisible();
    await expect(page.locator('[data-placeholder="route-panel"]')).toHaveCount(0);
    await expect.poll(() => logged[info.testId].some((e) => e.type === 'error' && String(e.data.message).includes('route-panel crashed'))).toBe(true);
  });

  test('ui choice is remembered and ?ui=legacy returns to the legacy app', async ({ page }) => {
    await page.goto('/?ui=next&e2e');
    await expect(page.locator('[data-placeholder="home-screen"]')).toBeVisible();
    await page.goto('/?e2e');
    await expect(page.locator('[data-placeholder="home-screen"]')).toBeVisible();
    await page.goto('/?ui=legacy&e2e');
    await expect(page.locator('.map canvas.maplibregl-canvas')).toBeVisible();
    await expect(page.locator('[data-placeholder="home-screen"]')).toHaveCount(0);
  });
});
