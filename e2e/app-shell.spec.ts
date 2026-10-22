import { expect, test } from '@playwright/test';
import { cameraPadding, collectLog, dialogOrPlaceholder, header, mapCanvas, openEditor, openHome, prepare, removeTrip, seedTrip } from './flows/helpers';
import { emptyTrips } from './fixtures/api';

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test.describe('app shell @map', () => {
  test('Home renders the header, the home screen and the shared map', async ({ page }) => {
    await openHome(page);
    await expect(header(page)).toBeVisible();
    await expect(mapCanvas(page)).toBeVisible();
    await expect(page.getByTestId('editor-shell')).toHaveCount(0);
    expect(await page.evaluate(() => Object.keys((window as unknown as { __ta: object }).__ta))).toEqual(expect.arrayContaining(['map', 'player']));
  });

  test('New trip opens the editor and the same map canvas survives navigation both ways', async ({ page }) => {
    await emptyTrips(page);
    await openHome(page);
    await mapCanvas(page).evaluate((el) => { (el as HTMLElement).dataset.keep = '1'; });
    await page.getByRole('button', { name: 'Новое путешествие' }).click();
    await expect(page).toHaveURL(/\/trip\/[^/?]+\?e2e$/);
    await expect(page.getByTestId('editor-shell')).toBeVisible();
    await expect(mapCanvas(page)).toHaveAttribute('data-keep', '1');
    await page.goBack();
    await expect(page.getByTestId('home-screen')).toBeVisible();
    await expect(mapCanvas(page)).toHaveAttribute('data-keep', '1');
  });

  test('deep link /trip/:id loads the saved trip into the editor', async ({ page, request }) => {
    const trip = await seedTrip(request);
    await openEditor(page, trip.id);
    await expect(page.getByRole('textbox', { name: 'Название путешествия' })).toHaveValue(trip.title);
    await expect(page.getByRole('heading', { name: 'Видео' })).toBeVisible();
    await expect(page.getByTestId('home-screen')).toHaveCount(0);
    await expect.poll(() => cameraPadding(page)).toMatchObject({ left: expect.any(Number), right: expect.any(Number) });
    await removeTrip(request, trip.id);
  });

  test('settings opens from the header and closes with Done', async ({ page }) => {
    await openHome(page);
    await header(page).getByRole('button', { name: 'Настройки' }).click();
    const dialog = page.getByRole('dialog', { name: 'Настройки' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Готово' }).click();
    await expect(dialog).toBeHidden();
  });

  test('@no-phone Preview clears the camera padding', async ({ page, request }) => {
    const trip = await seedTrip(request);
    await openEditor(page, trip.id);
    await header(page).getByRole('button', { name: 'Превью' }).click();
    await expect.poll(() => cameraPadding(page)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    await removeTrip(request, trip.id);
  });

  test('@no-phone Export opens its dialog from the header', async ({ page, request }) => {
    const trip = await seedTrip(request);
    await openEditor(page, trip.id);
    await header(page).getByRole('button', { name: /^Экспорт/ }).click();
    await expect(dialogOrPlaceholder(page, 'export-dialog')).toBeVisible();
    await removeTrip(request, trip.id);
  });

  test('an error thrown in one slot is caught, toasted and logged; siblings stay', async ({ page, request }) => {
    const log = await collectLog(page);
    const trip = await seedTrip(request);
    await page.goto(`/trip/${trip.id}?e2e&crash=video-panel`);
    await expect(page.getByRole('alert')).toContainText('video-panel crashed');
    await expect(page.getByRole('heading', { name: 'Видео' })).toHaveCount(0);
    await expect(page.getByTestId('editor-shell')).toBeVisible();
    await expect(header(page)).toBeVisible();
    await log.waitFor('error', (d) => String(d.message).includes('video-panel crashed'));
    await removeTrip(request, trip.id);
  });

  test('a visit reports its device, and an export the previous visit died in', async ({ page }) => {
    const log = await collectLog(page);
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      const t = Date.now() - 60_000;
      localStorage.setItem('ta.job', JSON.stringify({ job: 'export', session: 'earlier-visit', startedAt: t, beatAt: t + 30_000, trip: 't1', stage: 'render', progress: 0.42 }));
    });
    await openHome(page);
    expect((await log.waitFor('session.start')).data).toMatchObject({ mobile: expect.any(Boolean), dpr: expect.any(Number) });
    expect((await log.waitFor('export.crashed')).data).toMatchObject({ trip: 't1', stage: 'render', progress: 0.42, ranS: 30 });
    expect(await page.evaluate(() => localStorage.getItem('ta.job'))).toBeNull();
    await page.reload();
    await expect(page.getByTestId('home-screen')).toBeVisible();
    expect(log.ofType('export.crashed')).toHaveLength(1);
  });
});
