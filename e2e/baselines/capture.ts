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
  await page.goto(path);
  await page.waitForFunction(() => {
    const a = (window as any).__anim;
    return a && a.map.loaded() && a.map.getSource('stops');
  });
  // the app's own setTrip for its empty trip must land before ours
  await page.waitForTimeout(500);
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
    const maplibreUrl = () => performance.getEntriesByType('resource').map((e) => e.name).find((n) => /maplibre-gl\.mjs/.test(n))!;
    const { MercatorCoordinate } = await load(maplibreUrl());
    return points.map(([lng, lat, alt]) => {
      const m = MercatorCoordinate.fromLngLat({ lng, lat }, alt);
      return { lng, lat, alt, x: m.x, y: m.y, z: m.z, meterUnit: m.meterInMercatorCoordinateUnits() };
    });
  }, MERCATOR_POINTS);
}

export async function captureMigrate(page: Page) {
  return page.evaluate(async (inputs) => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { migrate } = await load('/src/route.ts');
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

export const RGBA = ['r', 'g', 'b', 'a'] as const;
export interface Sample { name: string; x: number; y: number; rgba: number[] }
export interface OverlayCapture { t: number; frame: string; samples: Sample[]; png: string }

/**
 * export-like path: a second map with preserveDrawingBuffer, since the main map's canvas reads back transparent.
 * `times` are looked up from the fixture timeline when null (recorder) and replayed from the baseline otherwise.
 */
export async function captureOverlay(page: Page, times: { ground: number; air: number } | null) {
  return page.evaluate(async ({ stops, legs, speed, times }) => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { Animator, idle, loadStyle, TILE_CACHE_ZOOM_LEVELS } = await load('/src/animator.ts');
    const maplibreUrl = () => performance.getEntriesByType('resource').map((e) => e.name).find((n) => /maplibre-gl\.mjs/.test(n))!;
    const { MercatorCoordinate, Map: MlMap } = await load(maplibreUrl());
    const W = 960, H = 540;
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:0;top:0;width:${W}px;height:${H}px;z-index:-1`;
    document.body.append(host);
    const map = new MlMap({
      container: host, style: await loadStyle('satellite'), interactive: false, attributionControl: false, fadeDuration: 0, pixelRatio: 1,
      maxTileCacheZoomLevels: TILE_CACHE_ZOOM_LEVELS, canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
    });
    try {
      const anim = new Animator(map);
      await new Promise((r) => map.once('load', r));
      await anim.setTrip(stops, legs, speed);
      const tl = anim.tl;
      const at = (leg: any, progress: number) => leg.start + ((leg.end - leg.start) * Math.acos(1 - 2 * progress)) / Math.PI;
      const airIdx = tl.legs.findIndex((l: any) => l.mode === 'air');
      const groundIdx = tl.legs.findIndex((l: any) => l.mode === 'ground');
      const T = times ?? { ground: at(tl.legs[groundIdx], 0.7), air: at(tl.legs[airIdx], 0.8) };

      // the matrices of the last frame the three layer drew, taken from the layer's own render call
      let last: any;
      const renderThree = anim.renderThree.bind(anim);
      anim.renderThree = (gl: unknown, data: unknown) => { last = data; return renderThree(gl, data); };

      const R = 6371008.8, rad = Math.PI / 180;
      // projects a point at altitude with the same matrices the three layer is rendered with
      const project = (lng: number, lat: number, alt: number) => {
        const d = last;
        const g = d.projectionTransition ?? 0;
        const globe = g >= 0.5;
        const m = globe || g === 0 ? d.mainMatrix : d.fallbackMatrix;
        let p: number[];
        if (globe) {
          const k = 1 + alt / R, c = Math.cos(lat * rad);
          p = [Math.sin(lng * rad) * c * k, Math.sin(lat * rad) * k, Math.cos(lng * rad) * c * k];
        } else {
          const c = MercatorCoordinate.fromLngLat({ lng, lat }, alt);
          p = [c.x, c.y, c.z];
        }
        const clip = [0, 1, 2, 3].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);
        return [((clip[0] / clip[3] + 1) / 2) * W, ((1 - clip[1] / clip[3]) / 2) * H];
      };

      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const patch = (x: number, y: number) => {
        const px = Math.round(x), py = Math.round(y);
        if (px < 2 || py < 2 || px > W - 3 || py > H - 3) throw new Error(`sample point (${x}, ${y}) is outside the canvas`);
        const d = ctx.getImageData(px - 2, py - 2, 5, 5).data;
        const sum = [0, 0, 0, 0];
        for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 4; k++) sum[k] += d[i + k];
        return { x: px, y: py, rgba: sum.map((s) => s / 25) };
      };
      const render = async (t: number) => {
        anim.setFrame(t);
        await idle(map);
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(map.getCanvas(), 0, 0, W, H);
      };
      const bytes = () => ctx.canvas.toDataURL('image/png').split(',')[1];

      const out: Record<string, any> = { times: T };
      await render(T.ground);
      const gf = anim.frame;
      const gLeg = tl.legs[groundIdx];
      const trailPt = gLeg.path[Math.floor(gLeg.path.length * 0.3)];
      out.ground = {
        samples: [
          { name: 'figure', ...patch(...(project(gf.pos[0], gf.pos[1], gf.alt) as [number, number])) },
          { name: 'trail', ...patch(...(project(trailPt[0], trailPt[1], 0) as [number, number])) },
          { name: 'background', ...patch(24, 24) },
        ],
        png: bytes(),
      };
      await render(T.air);
      const af = anim.frame;
      const aLeg = tl.legs[airIdx];
      const { pointAt } = await load('/src/timeline.ts');
      const { pos: midPt, alt: midAlt } = pointAt(aLeg, 0.5);
      out.air = {
        samples: [
          { name: 'figure', ...patch(...(project(af.pos[0], af.pos[1], af.alt) as [number, number])) },
          { name: 'arc-mid', ...patch(...(project(midPt[0], midPt[1], midAlt) as [number, number])) },
          { name: 'background', ...patch(24, 24) },
        ],
        png: bytes(),
      };
      return out;
    } finally {
      map.remove();
      host.remove();
    }
  }, { stops: THREE_LEGS.stops, legs: THREE_LEGS.legs, speed: THREE_LEGS.speed, times });
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

/** a figure that renders nothing would make the pixel baseline meaningless */
export function assertFigureVisible(samples: Sample[], label: string) {
  const fig = samples.find((s) => s.name === 'figure')!, bg = samples.find((s) => s.name === 'background')!;
  const diff = Math.max(...fig.rgba.slice(0, 3).map((v, k) => Math.abs(v - bg.rgba[k])));
  if (diff <= 30) throw new Error(`${label}: figure sample ${JSON.stringify(fig.rgba)} is indistinguishable from background ${JSON.stringify(bg.rgba)} (max channel diff ${diff})`);
}
