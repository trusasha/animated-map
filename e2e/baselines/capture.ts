/* eslint-disable @typescript-eslint/no-explicit-any -- page code reaches into untyped app internals */
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { stubNet } from '../fixtures/net';

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/trips/${name}.json`, import.meta.url), 'utf8'));
export const THREE_LEGS = fixture('three-legs');
export const MIGRATE_INPUTS = ['trip-legs-v1', 'trip-chained', 'trip-broken'].map((n) => [n, fixture(n)] as const);

/** the pre-refactor editor map: a MapPlayer in the map pane the old 1440x900 layout gave it (1060x835 right of a 380px panel) */
export async function boot(page: Page) {
  await stubNet(page);
  // a page without the app: its own map would compete for the software GL
  await page.goto('/api/config');
  await page.evaluate(async () => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    await load('/src/services/map/index.ts');
    const { MapPlayer } = await load('/src/services/map/player.ts');
    const { registerDemProtocol } = await load('/src/services/map/styles/dem.ts');
    const { installImageResolver } = await load('/src/services/map/styles/imageResolver.ts');
    const { loadStyle } = await load('/src/services/map/styles/loadStyle.ts');
    const { TILE_CACHE_ZOOM_LEVELS } = await load('/src/services/map/styles/hosts.ts');
    const { createOverlay3D } = await load('/src/services/scene3d/index.ts');
    const maplibreUrl = () => performance.getEntriesByType('resource').map((e) => e.name).find((n) => /maplibre-gl\.mjs/.test(n))!;
    const { Map: MlMap } = await load(maplibreUrl());
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:380px;top:0;width:1060px;height:835px';
    document.body.append(host);
    const map = new MlMap({ container: host, style: await loadStyle('satellite'), center: [20, 30], zoom: 1.4, maxTileCacheZoomLevels: TILE_CACHE_ZOOM_LEVELS, canvasContextAttributes: { antialias: true } });
    registerDemProtocol();
    installImageResolver(map);
    const player = new MapPlayer(map, createOverlay3D());
    await new Promise((r) => map.once('load', r));
    // the old editor handed its empty trip to the map before anything else
    await player.setTrip([], [], 1);
    player.setContext([]);
    player.setFrame(null);
    (window as any).__player = player;
  });
}

export async function captureFrames(page: Page) {
  return page.evaluate(async ({ stops, legs, speed }) => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { idle } = await load('/src/services/map/createOffscreenMap.ts');
    const a = (window as any).__player;
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
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { planTiles } = await load('/src/services/map/preload/plan.ts');
    const a = (window as any).__player;
    a.stop();
    await a.setTrip(stops, legs, speed);
    const planned = await planTiles(a.map, a.lod, a.tl, () => true, () => {});
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
    const { clampBathymetry } = await load('/src/domain/dem.ts');
    const input: number[] = [];
    for (let i = 0; i < 16; i++) input.push(i * 16 + (i % 2), (i * 37) % 256, (i * 91) % 256, 255);
    const output = Array.from(clampBathymetry(new Uint8ClampedArray(input)) as Uint8ClampedArray);
    return { input, output };
  });
}

export async function captureThumbs(page: Page) {
  return page.evaluate(async () => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { FIGURE_IDS, figureThumb } = await load('/src/services/scene3d/index.ts');
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
