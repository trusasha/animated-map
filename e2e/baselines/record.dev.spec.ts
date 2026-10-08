import { mkdirSync, writeFileSync } from 'node:fs';
import { test } from '@playwright/test';
import { assertFigureVisible, BASELINES, boot, captureDemClamp, captureFigures, captureFrames, captureMercator, captureMigrate, captureOverlay, capturePreload, captureThumbs } from './capture';

// Run once on the pre-refactor tree: RECORD=1 npm run test:e2e -- --project=dev --grep @record
test.describe.configure({ mode: 'serial' });
test.setTimeout(240_000);

const write = (name: string, data: unknown) => writeFileSync(new URL(name, BASELINES), typeof data === 'string' || Buffer.isBuffer(data) ? data : `${JSON.stringify(data, null, 2)}\n`);

test.beforeAll(() => mkdirSync(BASELINES, { recursive: true }));

test('records frames, preload, mercator, migrate and dem-clamp baselines @record', async ({ page }) => {
  await boot(page);
  write('frames.json', await captureFrames(page));
  write('preload.json', await capturePreload(page));
  write('mercator.json', await captureMercator(page));
  write('migrate.json', await captureMigrate(page));
  write('dem-clamp.json', await captureDemClamp(page));
});

test('records overlay pixels from an offscreen preserveDrawingBuffer map @record', async ({ page }) => {
  await boot(page);
  const { times, ground, air } = await captureOverlay(page, null);
  assertFigureVisible(ground.samples, 'ground');
  assertFigureVisible(air.samples, 'air');
  write('overlay-ground.png', Buffer.from(ground.png, 'base64'));
  write('overlay-air.png', Buffer.from(air.png, 'base64'));
  write('overlay-pixels.json', { times, ground: ground.samples, air: air.samples });
});

test('records figures screenshot and thumbs hashes @record', async ({ page }) => {
  write('figures.png', await captureFigures(page));
  await boot(page);
  write('thumbs.json', await captureThumbs(page));
});
