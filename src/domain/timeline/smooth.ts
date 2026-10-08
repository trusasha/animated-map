import { cumulative, clamp, lerp, lerpLL, MAX_TURN, metersPerPx, MIN_BEND_PX } from './constants';
import type { LngLat } from '../types';

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
