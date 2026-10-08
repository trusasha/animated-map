import { expect, test, type Page } from '@playwright/test';
import { stubNet } from './fixtures/net';

const CORS = { 'access-control-allow-origin': '*' };
const TRIP = {
  id: 'export-smoke',
  title: 'Export smoke',
  data: {
    stops: [
      { id: 'a', name: 'Paris', lng: 2.3522, lat: 48.8566 },
      { id: 'b', name: 'Berlin', lng: 13.405, lat: 52.52, leg: { mode: 'air', figure: 'airplane', pathKey: 'a>b:air', path: [[2.3522, 48.8566], [13.405, 52.52]] } },
      { id: 'c', name: 'Rome', lng: 12.4964, lat: 41.9028, leg: { mode: 'air', figure: 'airplane', pathKey: 'b>c:air', path: [[13.405, 52.52], [12.4964, 41.9028]] } },
    ],
    style: 'satellite',
    speed: 12,
    format: '1:1',
  },
};

/** the trip is served to the legacy app through the API; the export runs through its own dialog (🎬 Видео → 🎬 Рендер) */
async function openExport(page: Page) {
  await stubNet(page);
  await page.route('**/api/trips', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: [{ id: TRIP.id, title: TRIP.title }], headers: CORS }) : r.fallback()));
  await page.route(`**/api/trips/${TRIP.id}`, (r) => r.fulfill({ json: TRIP, headers: CORS }));
  await page.goto('/?e2e');
  const open = page.getByRole('button', { name: '🎬 Видео' });
  await expect(open).toBeEnabled({ timeout: 60_000 });
  await open.click();
  await page.getByRole('button', { name: '🎬 Рендер' }).click({ timeout: 120_000 });
}

/** number of samples (frames) in the mp4's first video track, from the stsz box */
const sampleCount = (b: Uint8Array) => {
  const i = Buffer.from(b).indexOf('stsz');
  return new DataView(b.buffer, b.byteOffset).getUint32(i + 12);
};

test.setTimeout(300_000);

test.describe('video export @map', () => {
  test.describe.configure({ retries: 1 });

  test('exports a 1:1 mp4 with one encoded frame per progress step', async ({ page }) => {
    await page.goto('/');
    const h264 = await page.evaluate(() => typeof VideoEncoder !== 'undefined' && VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: 1080, height: 1080 }).then((r) => !!r.supported));
    test.skip(!h264, 'this browser has no H.264 encoder (Chromium without proprietary codecs)');
    await openExport(page);
    const link = page.getByRole('link', { name: /Скачать MP4/ });
    await expect(link).toBeVisible({ timeout: 240_000 });
    const duration = await page.evaluate(() => (window as unknown as { __anim: { tl: { duration: number } } }).__anim.tl.duration);
    const bytes = await page.evaluate(async (href) => [...new Uint8Array(await (await fetch(href)).arrayBuffer())], (await link.getAttribute('href'))!);
    const mp4 = Uint8Array.from(bytes);
    expect(mp4.length).toBeGreaterThan(10_000);
    expect(Buffer.from(mp4.subarray(4, 8)).toString('latin1')).toBe('ftyp');
    expect(sampleCount(mp4)).toBe(Math.ceil(duration * 30) + 1);
  });

  test('reports codec-unsupported when no H.264 config is supported', async ({ page }) => {
    await page.addInitScript(() => { VideoEncoder.isConfigSupported = async (config) => ({ supported: false, config }); });
    await openExport(page);
    await expect(page.locator('.dialog.export .error')).toContainText('Браузер не умеет кодировать H.264', { timeout: 240_000 });
  });
});
