import type { LngLat, Stop } from '../types';
import { clamp, cumulative, HOLD, INTRO, MAX_ZOOM, OUTRO, SWAP } from './constants';
import { smoothPath } from './smooth';
import type { Bounds, FitFn, LegInput, TLeg, Timeline } from './types';

function bounds(paths: LngLat[][]): Bounds {
  const b: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of paths) for (const [x, y] of p) {
    b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y);
  }
  return b;
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
      mode: leg.mode, figure: leg.figure, color: leg.color, from: stops[i]?.name ?? '', to: stops[i + 1]?.name ?? '',
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
