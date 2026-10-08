import { bearing, distance } from '../geo';
import { clamp, INTRO, lerp, lerpLL, OUTRO } from './constants';
import type { Frame, TLeg, Timeline } from './types';

const easeInOut = (t: number) => (1 - Math.cos(Math.PI * clamp(t, 0, 1))) / 2;
const easeOutBack = (t: number) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };

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
