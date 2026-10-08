import { expect, test, type Page } from '@playwright/test';
import { collectLog, openEditor, openSettings, removeTrip, seedTrip, stubbed } from './helpers';

const DEFAULTS = { theme: 'system', lang: 'ru', figures: { air: 'airplane', ground: 'car', water: 'ship' }, colors: { air: '#0075de', ground: '#dd5b00', water: '#2a9d99' }, flyKm: 600, exportLongSide: 1920 };

test.describe.configure({ mode: 'serial' });

const resetServer = (page: Page) => page.request.put('/api/settings', { data: DEFAULTS });
const saved = async (page: Page) => (await page.request.get('/api/settings')).json();

test.beforeEach(async ({ page }) => {
  await stubbed(page);
  await resetServer(page);
});
test.afterAll(async ({ request }) => {
  await request.put('/api/settings', { data: DEFAULTS });
});

test('theme, language, default figure and fly threshold persist across reload', async ({ page }) => {
  await page.goto('/?ui=next&e2e');
  let dialog = await openSettings(page);
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
  dialog = await openSettings(page);
  await expect(dialog.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(dialog.getByRole('group', { name: 'Air' }).getByRole('button', { name: /Helicopter/ })).toHaveAttribute('aria-pressed', 'true');
});

test('the export quality section stays hidden and Reset restores defaults', async ({ page }) => {
  await page.request.put('/api/settings', { data: { ...DEFAULTS, theme: 'dark', lang: 'en', flyKm: 900 } });
  await page.goto('/?ui=next&e2e');
  const dialog = await openSettings(page);
  await expect(dialog.getByText('Line colors')).toBeVisible();
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
  const dialog = await openSettings(page);
  await dialog.getByRole('button', { name: 'Готово' }).click();
  await expect(dialog).toBeHidden();
});

test('theme and language changes are logged as settings.change', async ({ page }) => {
  const log = await collectLog(page);
  await page.goto('/?ui=next&e2e');
  const dialog = await openSettings(page);
  await dialog.getByRole('radio', { name: 'Тёмное' }).check({ force: true });
  await dialog.getByRole('radio', { name: 'English' }).check({ force: true });
  const entry = await log.waitFor('settings.change');
  expect(entry.data).toMatchObject({ theme: 'dark', lang: 'en' });
});

test('video panel renders style select and speed slider', async ({ page, request }) => {
  const trip = await seedTrip(request);
  await openEditor(page, trip.id);
  const panel = page.locator('section', { hasText: 'Видео' });
  await expect(panel.getByRole('combobox')).toHaveValue('satellite');
  await expect(panel.getByRole('slider')).toHaveAttribute('aria-valuenow', '1');
  await expect(panel.getByRole('combobox').locator('option')).toHaveCount(4);
  await removeTrip(request, trip.id);
});
