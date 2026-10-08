import type { LngLat, Mode } from './types';

const R = 6371008.8;
const rad = Math.PI / 180;

export function distance(a: LngLat, b: LngLat) {
  const dLat = (b[1] - a[1]) * rad, dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** degrees clockwise from north */
export function bearing(a: LngLat, b: LngLat) {
  const y = Math.sin((b[0] - a[0]) * rad) * Math.cos(b[1] * rad);
  const x = Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos((b[0] - a[0]) * rad);
  return Math.atan2(y, x) / rad;
}

/** longitudes are unwrapped so the line never jumps across the antimeridian */
export function unwrap(path: LngLat[]): LngLat[] {
  const out: LngLat[] = [];
  for (const [lng, lat] of path) {
    const prev = out[out.length - 1];
    let l = lng;
    if (prev) while (l - prev[0] > 180) l -= 360;
    if (prev) while (l - prev[0] < -180) l += 360;
    out.push([l, lat]);
  }
  return out;
}

export function greatCircle(a: LngLat, b: LngLat, n = 96): LngLat[] {
  const toV = ([lng, lat]: LngLat) => [Math.cos(lat * rad) * Math.cos(lng * rad), Math.cos(lat * rad) * Math.sin(lng * rad), Math.sin(lat * rad)];
  const va = toV(a), vb = toV(b);
  const omega = Math.acos(Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2])));
  if (omega < 1e-9) return [a, b];
  const out: LngLat[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ka = Math.sin((1 - t) * omega) / Math.sin(omega), kb = Math.sin(t * omega) / Math.sin(omega);
    const v = [0, 1, 2].map((k) => ka * va[k] + kb * vb[k]);
    out.push([Math.atan2(v[1], v[0]) / rad, Math.atan2(v[2], Math.hypot(v[0], v[1])) / rad]);
  }
  return unwrap(out);
}

/** Douglas–Peucker in degree space (good enough for rough animation paths) */
export function simplify(path: LngLat[], tolerance: number): LngLat[] {
  if (path.length < 3) return path;
  const keep = new Uint8Array(path.length);
  keep[0] = keep[path.length - 1] = 1;
  const stack: [number, number][] = [[0, path.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    const [ax, ay] = path[s], [bx, by] = path[e];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1e-18;
    let max = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const t = Math.max(0, Math.min(1, ((path[i][0] - ax) * dx + (path[i][1] - ay) * dy) / len2));
      const d = Math.hypot(path[i][0] - ax - t * dx, path[i][1] - ay - t * dy);
      if (d > max) { max = d; idx = i; }
    }
    if (max > tolerance) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return path.filter((_, i) => keep[i]);
}

async function roadRoute(a: LngLat, b: LngLat): Promise<LngLat[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`;
  const json = await (await fetch(url)).json();
  const coords: LngLat[] | undefined = json.routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) throw new Error(json.message || 'no route');
  // rough the road so the figure doesn't twitch on every hairpin
  const tol = Math.max(0.0003, Math.hypot(b[0] - a[0], b[1] - a[1]) / 400);
  return [a, ...simplify(coords, tol), b];
}

export async function buildPath(a: LngLat, b: LngLat, mode: Mode): Promise<LngLat[]> {
  if (mode === 'ground') {
    try { return unwrap(await roadRoute(a, b)); } catch (e) { console.warn('road route failed, straight line', e); }
  }
  return greatCircle(a, b);
}

