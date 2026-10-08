/* eslint-disable @typescript-eslint/no-explicit-any -- page code reaches into untyped app internals */
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { emptyTrips } from '../fixtures/api';
import { stubNet } from '../fixtures/net';

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/trips/${name}.json`, import.meta.url), 'utf8'));
export const THREE_LEGS = fixture('three-legs');
export const MIGRATE_INPUTS = ['trip-legs-v1', 'trip-chained', 'trip-broken'].map((n) => [n, fixture(n)] as const);

/** boots the legacy app on the dev server and waits until its Animator has installed the map layers */
export async function boot(page: Page, path = '/') {
  await stubNet(page);
  await emptyTrips(page);
  // counts the app's own completed setTrip calls without changing what they do
  await page.addInitScript(() => {
    let anim: any;
    (window as any).__setTripDone = 0;
    Object.defineProperty(window, '__anim', {
      configurable: true,
      get: () => anim,
      set: (a) => {
        const setTrip = a.setTrip.bind(a);
        a.setTrip = async (...args: unknown[]) => {
          try { return await setTrip(...args); } finally { (window as any).__setTripDone++; }
        };
        anim = a;
      },
    });
  });
  await page.goto(path);
  await page.waitForFunction(() => {
    const a = (window as any).__anim;
    return a && a.map.loaded() && a.map.getSource('stops');
  });
  // the app's own setTrip for its empty trip must land before ours
  await page.waitForFunction(() => (window as any).__setTripDone > 0);
}

export async function captureFrames(page: Page) {
  return page.evaluate(async ({ stops, legs, speed }) => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { idle } = await load('/src/animator.ts');
    const a = (window as any).__anim;
    a.stop();
    await a.setTrip(stops, legs, speed);
    const tl = a.tl;
    const times: [string, number][] = [['0', 0], ['1.1', 1.1], ['2.2', 2.2], ['3.1', 3.1], ['mid', tl.duration / 2], ['end-0.1', tl.duration - 0.1]];
    const frames = [];
    for (const [name, t] of times) {
      a.setFrame(t);
      await idle(a.map);
      const c = a.map.getCenter();
      frames.push({ name, t, frame: a.frame, map: { center: [c.lng, c.lat], zoom: a.map.getZoom(), pitch: a.map.getPitch() } });
    }
    return { duration: tl.duration, frames };
  }, { stops: THREE_LEGS.stops, legs: THREE_LEGS.legs, speed: THREE_LEGS.speed });
}

export async function capturePreload(page: Page) {
  return page.evaluate(async ({ stops, legs, speed }) => {
    const a = (window as any).__anim;
    a.stop();
    await a.setTrip(stops, legs, speed);
    const planned = await a.plannedTiles(a.tl, () => true, () => {});
    const urls: string[] = planned.urls;
    return { count: urls.length, first: urls.slice(0, 20), last: urls.slice(-20) };
  }, { stops: THREE_LEGS.stops, legs: THREE_LEGS.legs, speed: THREE_LEGS.speed });
}

const MERCATOR_POINTS: [number, number, number][] = [
  [0, 0, 0], [2.3522, 48.8566, 0], [-122.4194, 37.7749, 150], [139.6917, 35.6895, 10000],
  [0, 85, 0], [0, -85, 0], [45, 85, 500], [180, 0, 0], [-180, 0, 0],
  [179.9999, 45, 0], [-179.9999, -45, 1200], [12.4964, 41.9028, 35000],
];

export async function captureMercator(page: Page) {
  return page.evaluate(async (points) => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { mercatorCoord, meterInMercatorUnits } = await load('/src/domain/geo.ts');
    return points.map(([lng, lat, alt]) => {
      const m = mercatorCoord(lng, lat, alt);
      return { lng, lat, alt, x: m.x, y: m.y, z: m.z, meterUnit: meterInMercatorUnits(lat) };
    });
  }, MERCATOR_POINTS);
}

export async function captureMigrate(page: Page) {
  return page.evaluate(async (inputs) => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { migrate } = await load('/src/domain/route.ts');
    return Object.fromEntries(inputs.map(([name, trip]) => [name, migrate(trip)]));
  }, MIGRATE_INPUTS);
}

/** synthetic Terrarium tile: red channel sweeps below and above the 128 clamp, other channels vary independently */
export async function captureDemClamp(page: Page) {
  return page.evaluate(async () => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { clampDemPixels } = await load('/src/animator.ts');
    const input: number[] = [];
    for (let i = 0; i < 16; i++) input.push(i * 16 + (i % 2), (i * 37) % 256, (i * 91) % 256, 255);
    const output = Array.from(clampDemPixels(new Uint8ClampedArray(input)) as Uint8ClampedArray);
    return { input, output };
  });
}

export async function captureThumbs(page: Page) {
  return page.evaluate(async () => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { FIGURE_IDS } = await load('/src/figures.ts');
    const { figureThumb } = await load('/src/thumbs.ts');
    const hex = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const out: Record<string, string> = {};
    for (const id of FIGURE_IDS as string[]) out[id] = await hex(await figureThumb(id));
    return out;
  });
}

export const BASELINES = new URL('../fixtures/baselines/', import.meta.url);

export async function captureFigures(page: Page) {
  await page.goto('/figures.html?still');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1000);
  return page.locator('canvas').screenshot();
}

/** largest per-channel difference between two PNGs, or Infinity if their sizes differ */
export async function pngDiff(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(async ([x, y]) => {
    const decode = async (b64: string) => {
      const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
      const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(bmp, 0, 0);
      return ctx.getImageData(0, 0, bmp.width, bmp.height);
    };
    const [p, q] = [await decode(x), await decode(y)];
    if (p.width !== q.width || p.height !== q.height) return Infinity;
    let max = 0;
    for (let i = 0; i < p.data.length; i++) max = Math.max(max, Math.abs(p.data[i] - q.data[i]));
    return max;
  }, [a.toString('base64'), b.toString('base64')]);
}
