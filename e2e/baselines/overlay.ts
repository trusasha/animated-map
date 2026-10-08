/* eslint-disable @typescript-eslint/no-explicit-any -- page code reaches into untyped app internals */
import type { Page } from '@playwright/test';
import { THREE_LEGS } from './capture';

export interface Sample { name: string; x: number; y: number; rgba: number[] }

/**
 * export-like path: a second map with preserveDrawingBuffer, since the main map's canvas reads back transparent.
 * `times` are looked up from the fixture timeline when null (recorder) and replayed from the baseline otherwise.
 */
export async function captureOverlay(page: Page, times: { ground: number; air: number } | null) {
  return page.evaluate(async ({ stops, legs, speed, times }) => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { Animator } = await load('/src/animator.ts');
    const { idle } = await load('/src/services/map/createOffscreenMap.ts');
    const { loadStyle } = await load('/src/services/map/styles/loadStyle.ts');
    const { TILE_CACHE_ZOOM_LEVELS } = await load('/src/services/map/styles/hosts.ts');
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
      const { pointAt } = await load('/src/domain/timeline/index.ts');
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

/** a figure that renders nothing would make the pixel baseline meaningless */
export function assertFigureVisible(samples: Sample[], label: string) {
  const fig = samples.find((s) => s.name === 'figure')!, bg = samples.find((s) => s.name === 'background')!;
  const diff = Math.max(...fig.rgba.slice(0, 3).map((v, k) => Math.abs(v - bg.rgba[k])));
  if (diff <= 30) throw new Error(`${label}: figure sample ${JSON.stringify(fig.rgba)} is indistinguishable from background ${JSON.stringify(bg.rgba)} (max channel diff ${diff})`);
}
