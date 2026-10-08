import { expect, test, type Page } from '@playwright/test';
import { stubNet } from '../fixtures/net';

const DEFAULTS = { theme: 'system', lang: 'ru', figures: { air: 'airplane', ground: 'car', water: 'ship' }, colors: { air: '#0075de', ground: '#dd5b00', water: '#2a9d99' }, flyKm: 600, exportLongSide: 1920 };

test.describe.configure({ mode: 'serial' });

const resetServer = (page: Page) => page.request.put('/api/settings', { data: DEFAULTS });
const saved = async (page: Page) => (await page.request.get('/api/settings')).json();
const openDialog = async (page: Page) => {
  await page.locator('[data-placeholder="app-header"] button', { hasText: 'settings' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
};

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-light', 'one viewport is enough for persistence');
  await stubNet(page);
  await resetServer(page);
});
test.afterAll(async ({ request }) => {
  await request.put('/api/settings', { data: DEFAULTS });
});

test('theme, language, default figure and fly threshold persist across reload', async ({ page }) => {
  await page.goto('/?ui=next&e2e');
  let dialog = await openDialog(page);
  await expect(dialog.getByRole('heading', { name: 'Настройки' })).toBeVisible();

  await dialog.getByRole('radio', { name: 'Тёмное' }).check({ force: true });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await dialog.getByRole('radio', { name: 'English' }).check({ force: true });
  await expect(dialog.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(dialog.getByRole('radio', { name: 'Dark' })).toBeChecked();

  await dialog.getByRole('group', { name: 'Air' }).getByRole('button', { name: /Helicopter/ }).click();
  await dialog.getByRole('slider').focus();
  await page.keyboard.press('ArrowRight');

  await expect.poll(async () => (await saved(page)).flyKm).toBe(650);
  expect(await saved(page)).toMatchObject({ theme: 'dark', lang: 'en', figures: { air: 'helicopter', ground: 'car', water: 'ship' } });

  await page.reload();
  expect(await saved(page)).toMatchObject({ theme: 'dark', lang: 'en', flyKm: 650 });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  dialog = await openDialog(page);
  await expect(dialog.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(dialog.getByRole('group', { name: 'Air' }).getByRole('button', { name: /Helicopter/ })).toHaveAttribute('aria-pressed', 'true');
});

test('hidden sections stay hidden and Reset restores defaults', async ({ page }) => {
  await page.request.put('/api/settings', { data: { ...DEFAULTS, theme: 'dark', lang: 'en', flyKm: 900 } });
  await page.goto('/?ui=next&e2e');
  const dialog = await openDialog(page);
  await expect(dialog.getByText('Line colors')).toHaveCount(0);
  await expect(dialog.getByText('Export quality')).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Reset to defaults' }).click();
  await expect(dialog.getByRole('heading', { name: 'Настройки' })).toBeVisible();
  await expect(dialog.getByRole('radio', { name: 'Как в системе' })).toBeChecked();
  await expect.poll(async () => saved(page)).toMatchObject(DEFAULTS);

  await page.reload();
  expect(await saved(page)).toMatchObject(DEFAULTS);
});

test('Done closes the dialog', async ({ page }) => {
  await page.goto('/?ui=next&e2e');
  const dialog = await openDialog(page);
  await dialog.getByRole('button', { name: 'Готово' }).click();
  await expect(dialog).toBeHidden();
});

test('video panel slot renders style select and speed slider', async ({ page }) => {
  await page.goto('/trip/abc?ui=next&e2e');
  const panel = page.locator('section', { hasText: 'Видео' });
  await expect(panel.getByRole('combobox')).toHaveValue('satellite');
  await expect(panel.getByRole('slider')).toHaveAttribute('aria-valuenow', '1');
  await expect(panel.getByRole('combobox').locator('option')).toHaveCount(4);
});
