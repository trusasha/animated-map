import { bearing, distance } from './geo';
import type { LngLat, Mode, Stop } from './types';

export type Bounds = [number, number, number, number];
export type LegInput = { mode: Mode; figure: string; path: LngLat[]; speed?: number; smooth?: number };

/** on-screen figure length in CSS px; the animator sizes the 3D model from it */
export const FIG_PX = 76;
const metersPerPx = (zoom: number, lat: number) => (2 * Math.PI * 6371008.8 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
export type FitFn = (b: Bounds) => { zoom: number; center: LngLat };

export interface TLeg {
  mode: Mode; figure: string; from: string; to: string;
  path: LngLat[]; cum: number[]; length: number; peak: number;
  start: number; end: number; zMid: number; zClose: number; pitch: number;
}

export interface Timeline {
  legs: TLeg[]; duration: number;
  overview: { zoom: number; center: LngLat };
}

export interface Frame {
  legIndex: number;
  /** distance fraction travelled on legs[legIndex] */
  progress: number;
  pos: LngLat; alt: number; heading: number; climb: number;
  figure: string; mode: Mode; scale: number; spin: number;
  camera: { center: LngLat; zoom: number; pitch: number };
  label: string;
}

export const INTRO = 2.2, SWAP = 1.4, OUTRO = 3;
/** stop between two legs with the same figure: it just pauses there and turns to the next leg */
export const HOLD = 1;
const MAX_ZOOM = 14;
/** fastest the figure may turn, °/s; with the local speed this sets the minimum turn radius */
export const MAX_TURN = 1080;
/** bends smaller than this on screen are road noise, not route shape */
const MIN_BEND_PX = 10;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpLL = (a: LngLat, b: LngLat, t: number): LngLat => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const easeInOut = (t: number) => (1 - Math.cos(Math.PI * clamp(t, 0, 1))) / 2;
const easeOutBack = (t: number) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };

function bounds(paths: LngLat[][]): Bounds {
  const b: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of paths) for (const [x, y] of p) {
    b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y);
  }
  return b;
}

const cumulative = (path: LngLat[]) => {
  const cum = [0];
  for (let k = 1; k < path.length; k++) cum.push(cum[k - 1] + distance(path[k - 1], path[k]));
  return cum;
};

/**
 * Gaussian smoothing along the path with a per-point width: the larger of the turn radius the figure
 * can take at its speed there (fast mid-leg → wide sweeps) and a few px of screen at the camera zoom there.
 * The path is point-mirrored past its ends, so stops stay exact without narrowing the filter there.
 */
export function smoothPath(path: LngLat[], duration: number, zClose: number, zMid: number, k = 1): LngLat[] {
  const cum = cumulative(path), L = cum.at(-1)!;
  if (path.length < 3 || L === 0 || k <= 0) return path;
  // ~4 samples per narrowest filter width (the screen floor at the closest zoom)
  const n = clamp(Math.ceil((4 * L) / (k * MIN_BEND_PX * metersPerPx(zClose, path[0][1]))), 50, 4000), step = L / n;
  const pts: LngLat[] = [];
  for (let i = 0, k = 1; i <= n; i++) {
    const s = i * step;
    while (k < cum.length - 1 && cum[k] < s) k++;
    const u = clamp((s - cum[k - 1]) / (cum[k] - cum[k - 1] || 1), 0, 1);
    pts.push(lerpLL(path[k - 1], path[k], u));
  }
  const at = (j: number): LngLat => j < 0 ? [2 * pts[0][0] - pts[-j][0], 2 * pts[0][1] - pts[-j][1]]
    : j > n ? [2 * pts[n][0] - pts[2 * n - j][0], 2 * pts[n][1] - pts[2 * n - j][1]] : pts[j];
  const sigmas = pts.map((p, i) => {
    const f = i / n;
    // speed under easeInOut timing: dfrac/dtime = π·sqrt(f(1-f))
    const v = (L / duration) * Math.PI * Math.sqrt(f * (1 - f));
    const zoom = lerp(zClose, zMid, Math.sin(Math.PI * f));
    return k * Math.max(v / (MAX_TURN * Math.PI / 180), MIN_BEND_PX * metersPerPx(zoom, p[1]));
  });
  return pts.map((p, i) => {
    const sigma = sigmas[i];
    // ponytail: window capped at ±1500 samples; at 4000 samples a sweep wider than ~1/3 of the leg gets clipped
    // the mirrored copies only reach one leg-length past each end
    const w = Math.min(Math.ceil((3 * sigma) / step), 1500, n);
    if (w < 1) return p;
    let x = 0, y = 0, sum = 0;
    for (let j = i - w; j <= i + w; j++) {
      const g = Math.exp(-0.5 * (((j - i) * step) / sigma) ** 2);
      const q = at(j);
      x += q[0] * g; y += q[1] * g; sum += g;
    }
    return [x / sum, y / sum];
  });
}

export function buildTimeline(
  stops: Stop[], legs: LegInput[], speed: number, fit: FitFn,
): Timeline {
  let t = INTRO;
  let shift = 0;
  const out: TLeg[] = legs.map((leg, i) => {
    // keep consecutive legs continuous in longitude
    const prevEnd = i > 0 ? legs[i - 1].path.at(-1)![0] + shift : leg.path[0][0];
    shift = Math.round((prevEnd - leg.path[0][0]) / 360) * 360;
    const shifted = leg.path.map(([x, y]): LngLat => [x + shift, y]);
    const km = cumulative(shifted).at(-1)! / 1000;
    const d = clamp(3 + 1.5 * Math.log2(1 + km / 100), 4, 12) / (speed * (leg.speed ?? 1));
    const zMid = clamp(fit(bounds([shifted])).zoom, 1.2, MAX_ZOOM);
    const zClose = Math.min(zMid + 1.6, MAX_ZOOM);
    const path = leg.mode === 'air' ? shifted : smoothPath(shifted, d, zClose, zMid, leg.smooth ?? 1);
    const cum = cumulative(path);
    const length = cum.at(-1)!;
    const tl: TLeg = {
      mode: leg.mode, figure: leg.figure, from: stops[i]?.name ?? '', to: stops[i + 1]?.name ?? '',
      path, cum, length,
      peak: leg.mode === 'air' ? clamp(length * 0.15, 2000, 1_200_000) : 0,
      start: t, end: t + d, zMid, zClose,
      pitch: leg.mode === 'air' ? 35 : leg.mode === 'water' ? 45 : 55,
    };
    const next = legs[i + 1];
    t += d + (!next ? 0 : next.figure === leg.figure ? HOLD : SWAP);
    return tl;
  });
  const overview = fit(bounds(out.map((l) => l.path)));
  overview.zoom = clamp(overview.zoom, 0.8, 12);
  return { legs: out, duration: t + OUTRO, overview };
}

/**
 * Most detailed camera zoom of the stretch around t (intro, a leg, a stop, outro). The map uses tiles for it
 * throughout, so it doesn't swap detail levels while the camera zooms; a swap can only happen between stretches.
 */
export function detailZoom(tl: Timeline, t: number): number {
  const { legs } = tl;
  if (t < INTRO) return legs[0].zClose;
  for (let i = 0; i < legs.length; i++) {
    if (t <= legs[i].end) return legs[i].zClose;
    const next = legs[i + 1];
    if (next && t < next.start) return Math.max(legs[i].zClose, next.zClose);
  }
  return legs.at(-1)!.zClose;
}

export function pointAt(leg: TLeg, frac: number) {
  const target = clamp(frac, 0, 1) * leg.length;
  let k = 1;
  while (k < leg.cum.length - 1 && leg.cum[k] < target) k++;
  const seg = leg.cum[k] - leg.cum[k - 1] || 1;
  const pos = lerpLL(leg.path[k - 1], leg.path[k], clamp((target - leg.cum[k - 1]) / seg, 0, 1));
  return { pos, alt: leg.peak * Math.sin(Math.PI * clamp(frac, 0, 1)), index: k };
}

/** travelled part of a leg, with altitude per vertex */
export function slicePath(leg: TLeg, frac: number): [number, number, number][] {
  const { pos, index } = pointAt(leg, frac);
  const alt = (k: number) => leg.peak * Math.sin(Math.PI * clamp(leg.cum[k] / (leg.length || 1), 0, 1));
  const out: [number, number, number][] = leg.path.slice(0, index).map((p, k) => [p[0], p[1], alt(k)]);
  out.push([pos[0], pos[1], leg.peak * Math.sin(Math.PI * clamp(frac, 0, 1))]);
  return out;
}

/** tangent of the (already smoothed) path: the figure points exactly where the route goes */
function orientation(leg: TLeg, frac: number) {
  const w = 0.5 / Math.max(leg.cum.length - 1, 1);
  const a = pointAt(leg, clamp(frac - w, 0, 1 - 2 * w));
  const b = pointAt(leg, clamp(frac + w, 2 * w, 1));
  const run = distance(a.pos, b.pos);
  return { heading: run > 0 ? bearing(a.pos, b.pos) : 0, climb: Math.atan2(b.alt - a.alt, run || 1) * 180 / Math.PI };
}

export function sample(tl: Timeline, t: number): Frame {
  const { legs, overview } = tl;
  const first = legs[0], last = legs.at(-1)!;
  const label = (l: TLeg) => `${l.from} → ${l.to}`;
  const onLeg = (i: number, frac: number, scale = 1, spin = 0): Frame => {
    const leg = legs[i];
    const p = pointAt(leg, frac);
    const zoom = lerp(leg.zClose, leg.zMid, Math.sin(Math.PI * frac));
    return {
      legIndex: i, progress: frac, pos: p.pos, alt: p.alt, ...orientation(leg, frac),
      figure: leg.figure, mode: leg.mode, scale, spin,
      camera: { center: p.pos, zoom, pitch: leg.pitch },
      label: label(leg),
    };
  };

  if (t < INTRO) {
    const u = easeInOut(t / INTRO);
    const pop = clamp((t / INTRO - 0.55) / 0.45, 0, 1);
    const f = onLeg(0, 0, pop > 0 ? easeOutBack(pop) : 0, (1 - pop) * Math.PI);
    // fly in: travel first, zoom last, so the view never parks over empty land
    f.camera = {
      center: lerpLL(overview.center, first.path[0], 1 - (1 - u) ** 2),
      zoom: lerp(overview.zoom, first.zClose, u ** 2),
      pitch: lerp(0, first.pitch, u),
    };
    return f;
  }
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    if (t <= leg.end) return onLeg(i, easeInOut((t - leg.start) / (leg.end - leg.start)));
    const next = legs[i + 1];
    if (next && t < next.start) {
      const u = (t - leg.end) / (next.start - leg.end);
      const e = easeInOut(u);
      if (next.figure === leg.figure) {
        const f = onLeg(i, 1);
        const into = onLeg(i + 1, 0);
        f.heading += (((into.heading - f.heading + 540) % 360) - 180) * e;
        f.climb *= 1 - e;
        f.camera = { center: leg.path.at(-1)!, zoom: lerp(leg.zClose, next.zClose, e), pitch: lerp(leg.pitch, next.pitch, e) };
        f.label = label(u < 0.5 ? leg : next);
        return f;
      }
      const f = u < 0.5
        ? onLeg(i, 1, 1 - easeInOut(u * 2), u * 2 * Math.PI)
        : onLeg(i + 1, 0, easeOutBack((u - 0.5) * 2), (1 - (u - 0.5) * 2) * -Math.PI);
      if (u >= 0.5) { f.legIndex = i; f.progress = 1; }
      f.camera = { center: leg.path.at(-1)!, zoom: lerp(leg.zClose, next.zClose, e), pitch: lerp(leg.pitch, next.pitch, e) };
      f.label = label(u < 0.5 ? leg : next);
      return f;
    }
  }
  const u = easeInOut((t - last.end) / OUTRO);
  const f = onLeg(legs.length - 1, 1);
  f.camera = { center: lerpLL(last.path.at(-1)!, overview.center, u ** 2), zoom: lerp(last.zClose, overview.zoom, 1 - (1 - u) ** 2), pitch: lerp(last.pitch, 20, u) };
  return f;
}
