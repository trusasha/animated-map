import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { BASELINES, boot, captureDemClamp, captureFigures, captureFrames, captureMercator, captureMigrate, capturePreload, captureThumbs, pngDiff } from './capture';
import { assertFigureVisible, captureOverlay, type Sample } from './overlay';

test.describe.configure({ mode: 'serial' });
test.setTimeout(240_000);

const read = (name: string) => readFileSync(new URL(name, BASELINES));
const json = (name: string) => JSON.parse(read(name).toString('utf8'));

/** deep equality where numbers may differ by `tol` and everything else must match exactly */
function expectClose(actual: unknown, expected: unknown, tol: number, path = '$'): void {
  if (typeof expected === 'number') {
    expect(typeof actual, path).toBe('number');
    expect(Math.abs((actual as number) - expected), `${path}: ${actual} vs ${expected}`).toBeLessThanOrEqual(tol);
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual), path).toBe(true);
    expect((actual as unknown[]).length, `${path} length`).toBe(expected.length);
    expected.forEach((e, i) => expectClose((actual as unknown[])[i], e, tol, `${path}[${i}]`));
  } else if (expected && typeof expected === 'object') {
    expect(actual && typeof actual === 'object', path).toBeTruthy();
    expect(Object.keys(actual as object).sort(), `${path} keys`).toEqual(Object.keys(expected).sort());
    for (const [k, v] of Object.entries(expected)) expectClose((actual as Record<string, unknown>)[k], v, tol, `${path}.${k}`);
  } else expect(actual, path).toEqual(expected);
}

test.describe('pre-refactor baselines @baseline', () => {
  test('timeline frames and camera match frames.json', async ({ page }) => {
    await boot(page);
    const expected = json('frames.json');
    const actual = await captureFrames(page);
    expectClose(actual.duration, expected.duration, 1e-9, 'duration');
    expect(actual.frames.length, 'frames length').toBe(expected.frames.length);
    actual.frames.forEach((f, i) => {
      expect(f.name).toBe(expected.frames[i].name);
      expectClose(f.frame, expected.frames[i].frame, 1e-9, `${f.name}.frame`);
      expectClose(f.map, expected.frames[i].map, 1e-6, `${f.name}.map`);
    });
  });

  test('planned preload tiles match preload.json', async ({ page }) => {
    await boot(page);
    expect(await capturePreload(page)).toEqual(json('preload.json'));
  });

  test('mercator coordinates match mercator.json', async ({ page }) => {
    await boot(page);
    const expected = json('mercator.json');
    const actual = await captureMercator(page);
    expect(actual.length, 'points length').toBe(expected.length);
    actual.forEach((p, i) => {
      expectClose({ x: p.x, y: p.y, z: p.z }, { x: expected[i].x, y: expected[i].y, z: expected[i].z }, 1e-12, `point ${i}`);
      expect(Math.abs(p.meterUnit - expected[i].meterUnit), `point ${i} meterUnit`).toBeLessThanOrEqual(1e-9 * expected[i].meterUnit);
    });
  });

  test('migrate output matches migrate.json', async ({ page }) => {
    await boot(page);
    expect(await captureMigrate(page)).toEqual(json('migrate.json'));
  });

  test('dem clamp output matches dem-clamp.json', async ({ page }) => {
    await boot(page);
    expect(await captureDemClamp(page)).toEqual(json('dem-clamp.json'));
  });

  test('figures gallery render matches figures.png', async ({ page }) => {
    const shot = await captureFigures(page);
    expect(await pngDiff(page, read('figures.png'), shot)).toBeLessThanOrEqual(6);
  });

  test('figure thumbs hash to thumbs.json', async ({ page }) => {
    await boot(page);
    expect(await captureThumbs(page)).toEqual(json('thumbs.json'));
  });

  test('overlay pixels from the offscreen export map match overlay-pixels.json', async ({ page }) => {
    await boot(page);
    const expected = json('overlay-pixels.json');
    const actual = await captureOverlay(page, expected.times);
    assertFigureVisible(actual.ground.samples, 'ground');
    assertFigureVisible(actual.air.samples, 'air');
    for (const key of ['ground', 'air'] as const) {
      expect(actual[key].samples.length, `${key} samples length`).toBe(expected[key].length);
      actual[key].samples.forEach((s: Sample, i: number) => {
        const e: Sample = expected[key][i];
        expect([s.name, s.x, s.y]).toEqual([e.name, e.x, e.y]);
        expectClose(s.rgba, e.rgba, 6, `${key}.${s.name}`);
      });
    }
  });
});
