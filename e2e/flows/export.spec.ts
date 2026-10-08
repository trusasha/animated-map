import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { defaultSettings } from '../fixtures/api';
import { stubNet } from '../fixtures/net';

const DATA = {
  stops: [
    { id: 'a', name: 'Paris', lng: 2.3522, lat: 48.8566 },
    { id: 'b', name: 'Versailles', lng: 2.12, lat: 48.8, leg: { mode: 'air', figure: 'airplane', pathKey: 'a>b:air', path: [[2.3522, 48.8566], [2.12, 48.8]] } },
    { id: 'c', name: 'Chartres', lng: 1.49, lat: 48.45, leg: { mode: 'air', figure: 'airplane', pathKey: 'b>c:air', path: [[2.12, 48.8], [1.49, 48.45]] } },
  ],
  style: 'satellite',
  speed: 12,
  format: '16:9',
  overlay: { title: true, label: true, progress: true },
};

type Shared = { name: string; type: string }[];
type Probe = { distinct: number; progress: number };

const logged = (page: Page) => {
  const events: { type: string; data: Record<string, unknown> }[] = [];
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/log')) events.push(r.postDataJSON()); });
  return events;
};

async function openExport(page: Page, request: APIRequestContext, title: string, settings: Record<string, unknown> = {}) {
  await stubNet(page);
  await defaultSettings(page);
  if (Object.keys(settings).length) await page.route('**/api/settings', (route) => route.request().method() === 'GET' ? route.fulfill({ json: settings, headers: { 'access-control-allow-origin': '*' } }) : route.fallback());
  const trip = await (await request.post('/api/trips', { data: { title, data: DATA } })).json();
  await page.goto(`/trip/${trip.id}?ui=next&e2e`);
  const open = page.getByRole('button', { name: /^Экспорт( видео)?$/ });
  await expect(open).toBeEnabled({ timeout: 60_000 });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Экспорт видео' });
  await expect(dialog.getByRole('heading', { name: 'Подгружаю карту для видео' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Рендер видео' })).toBeEnabled({ timeout: 120_000 });
  return { dialog, id: trip.id as string };
}

test.setTimeout(900_000);

test.describe('export dialog @map', () => {
  test.describe.configure({ retries: 0 });

  test('F10: captions, format reload, render, inline video, share', async ({ page, request }) => {
    await page.goto('/');
    const h264 = await page.evaluate(() => typeof VideoEncoder !== 'undefined' && VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: 1080, height: 1920 }).then((r) => !!r.supported));
    test.skip(!h264, 'this browser has no H.264 encoder (Chromium without proprietary codecs)');
    await page.addInitScript(() => {
      const w = window as unknown as { __shared: Shared };
      w.__shared = [];
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d: ShareData) => !!d.files?.length });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async (d: ShareData) => { w.__shared.push(...(d.files ?? []).map((f) => ({ name: f.name, type: f.type }))); } });
    });
    const events = logged(page);
    const title = `Export flow ${Date.now()}`;
    const { dialog, id } = await openExport(page, request, title);

    await dialog.getByRole('switch', { name: 'Подпись участка · откуда → куда' }).click();
    await expect(dialog.getByRole('switch', { name: 'Авторство карты' })).toHaveAttribute('aria-disabled', 'true');
    await dialog.getByRole('radio', { name: /9:16/ }).check({ force: true });
    await expect(dialog.getByText('Перезагружаю карту…')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Рендер видео' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Рендер видео' })).toBeEnabled({ timeout: 120_000 });
    await expect.poll(async () => (await (await request.get(`/api/trips/${id}`)).json()).data, { timeout: 10_000 })
      .toMatchObject({ format: '9:16', overlay: { title: true, label: false, progress: true } });

    await dialog.getByRole('button', { name: 'Рендер видео' }).click();
    await expect(dialog.getByRole('heading', { name: 'Рендер кадр за кадром' })).toBeVisible();
    await expect(dialog.getByText('Не закрывайте и не сворачивайте вкладку.')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog.getByRole('heading', { name: 'Рендер кадр за кадром' })).toBeVisible();

    await expect(dialog.getByRole('heading', { name: 'Видео готово' })).toBeVisible({ timeout: 780_000 });
    const probe = await page.evaluate(() => (window as unknown as { __ta: { exportProbe: Probe } }).__ta.exportProbe);
    expect(probe.distinct, 'mid-render map frame is not blank').toBeGreaterThan(2);
    const video = dialog.locator('video');
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.duration || 0)).toBeGreaterThan(0);

    const fileName = `${title.replace(/[^\p{L}\p{N}]+/gu, '-')}-9x16.mp4`;
    await expect(dialog.getByText(fileName)).toBeVisible();
    const share = dialog.getByRole('button', { name: 'Поделиться' });
    await expect(share).toHaveAttribute('data-variant', 'primary');
    await expect(dialog.getByRole('button', { name: 'Скачать MP4' })).toHaveAttribute('data-variant', 'secondary');
    await share.click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __shared: Shared }).__shared)).toEqual([{ name: fileName, type: 'video/mp4' }]);

    await expect.poll(() => events.map((e) => e.type)).toEqual(expect.arrayContaining(['export.open', 'export.done', 'export.share']));
    expect(events.find((e) => e.type === 'export.done')!.data).toMatchObject({ trip: id, format: '9:16', width: 1080, height: 1920 });
    await request.delete(`/api/trips/${id}`);
  });

  test('F10: long side 1080 renders a 608x1080 MP4 for 9:16', async ({ page, request }) => {
    await page.goto('/');
    const h264 = await page.evaluate(() => typeof VideoEncoder !== 'undefined' && VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: 608, height: 1080 }).then((r) => !!r.supported));
    test.skip(!h264, 'this browser has no H.264 encoder (Chromium without proprietary codecs)');
    const events = logged(page);
    const { dialog, id } = await openExport(page, request, `Export 1080 ${Date.now()}`, { exportLongSide: 1080 });
    await dialog.getByRole('radio', { name: /9:16/ }).check({ force: true });
    await expect(dialog.getByRole('button', { name: 'Рендер видео' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Рендер видео' })).toBeEnabled({ timeout: 120_000 });
    await dialog.getByRole('button', { name: 'Рендер видео' }).click();
    await expect(dialog.getByRole('heading', { name: 'Видео готово' })).toBeVisible({ timeout: 780_000 });
    await expect.poll(() => dialog.locator('video').evaluate((v: HTMLVideoElement) => [v.videoWidth, v.videoHeight])).toEqual([608, 1080]);
    await expect.poll(() => events.find((e) => e.type === 'export.done')?.data).toMatchObject({ format: '9:16', width: 608, height: 1080 });
    await request.delete(`/api/trips/${id}`);
  });

  test('F10: unsupported H.264 shows the codec error and logs export.error', async ({ page, request }) => {
    await page.addInitScript(() => { VideoEncoder.isConfigSupported = async (config) => ({ supported: false, config }); });
    const events = logged(page);
    const { dialog, id } = await openExport(page, request, `Export codec ${Date.now()}`);
    await dialog.getByRole('button', { name: 'Рендер видео' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Браузер не умеет кодировать H.264.');
    await expect(dialog.getByRole('button', { name: 'Повторить' })).toBeVisible();
    await expect.poll(() => events.find((e) => e.type === 'export.error')?.data).toMatchObject({ trip: id, code: 'codec-unsupported' });
    await dialog.getByRole('button', { name: 'Закрыть' }).first().click();
    await expect(dialog).toHaveCount(0);
    await request.delete(`/api/trips/${id}`);
  });
});
