import { expect, test } from '@playwright/test';
import { prepare } from './helpers';

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

const EMPTY = { stops: [], style: 'satellite', speed: 1, format: '9:16' };

test.describe('trips menu @map', () => {
  test('F13: rename and delete with confirm on a trip the test created', async ({ page, request }) => {
    const name = `Menu trip ${test.info().workerIndex}-${Date.now()}`;
    const trip = await (await request.post('/api/trips', { data: { title: name, data: EMPTY } })).json();
    await page.goto('/?ui=next&e2e');
    const row = page.getByTestId('trip-row').filter({ hasText: name });
    await row.hover();
    await row.getByRole('button', { name: 'Ещё' }).click();
    await page.getByRole('menuitem', { name: 'Переименовать путешествие' }).click();
    await page.getByRole('textbox', { name: 'Название' }).fill(`${name} renamed`);
    await page.getByRole('button', { name: 'Сохранить' }).click();
    const renamed = page.getByTestId('trip-row').filter({ hasText: `${name} renamed` });
    await expect(renamed).toBeVisible();
    expect((await (await request.get(`/api/trips/${trip.id}`)).json()).title).toBe(`${name} renamed`);

    await renamed.hover();
    await renamed.getByRole('button', { name: 'Ещё' }).click();
    await page.getByRole('menuitem', { name: 'Удалить путешествие' }).click();
    await expect(page.getByRole('alertdialog')).toContainText(`Удалить «${name} renamed»?`);
    await page.getByRole('button', { name: 'Отмена' }).click();
    await expect(renamed).toBeVisible();

    await renamed.hover();
    await renamed.getByRole('button', { name: 'Ещё' }).click();
    await page.getByRole('menuitem', { name: 'Удалить путешествие' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Удалить' }).click();
    await expect(renamed).toHaveCount(0);
    expect((await request.get(`/api/trips/${trip.id}`)).status()).toBe(404);
  });

  test('autosave: header rename shows Saving then Saved with a PUT within 1 s', async ({ page, request }) => {
    const trip = await (await request.post('/api/trips', { data: { title: 'Autosave trip', data: EMPTY } })).json();
    await page.goto(`/trip/${trip.id}?ui=next&e2e`);
    const input = page.getByRole('textbox', { name: 'Название путешествия' });
    await expect(input).toHaveValue('Autosave trip');
    const put = page.waitForRequest((r) => r.method() === 'PUT' && r.url().endsWith(`/api/trips/${trip.id}`));
    const t0 = Date.now();
    await input.fill('Autosave renamed');
    const phone = (page.viewportSize()?.width ?? 0) < 700;
    if (!phone) await expect(page.getByRole('status').filter({ hasText: 'Сохранение…' })).toBeVisible();
    expect((await put).postDataJSON().title).toBe('Autosave renamed');
    expect(Date.now() - t0).toBeLessThan(1000);
    if (!phone) await expect(page.getByRole('status').filter({ hasText: 'Сохранено' })).toBeVisible();
    await request.delete(`/api/trips/${trip.id}`);
  });

  test('header overflow deletes the open trip after confirm and goes Home', async ({ page, request }) => {
    const trip = await (await request.post('/api/trips', { data: { title: 'Header delete', data: EMPTY } })).json();
    await page.goto(`/trip/${trip.id}?ui=next&e2e`);
    await expect(page.getByRole('textbox', { name: 'Название путешествия' })).toHaveValue('Header delete');
    await page.getByRole('banner').getByRole('button', { name: 'Ещё' }).click();
    await page.getByRole('menuitem', { name: 'Удалить путешествие' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Удалить' }).click();
    await expect(page).toHaveURL(/\/\?ui=next&e2e$/);
    expect((await request.get(`/api/trips/${trip.id}`)).status()).toBe(404);
  });
});
