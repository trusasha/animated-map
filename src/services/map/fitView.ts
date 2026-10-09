import type { LngLat } from '../../domain/types';
import type { Padding } from './types';

const TILE = 512;
const mx = (lng: number) => (lng + 180) / 360;
const my = (lat: number) => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};
const unY = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;

/**
 * Centre and zoom that frame the points inside the area the padding leaves free. Plain Web Mercator maths:
 * maplibre's globe fit depends on where the camera starts and lands too close or too far.
 * ponytail: ignores the antimeridian; a leg across it gets framed the long way round.
 */
export function fitView(points: LngLat[], width: number, height: number, p: Padding, maxZoom: number) {
  const xs = points.map(([lng]) => mx(lng)), ys = points.map(([, lat]) => my(lat));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = Math.max(1, width - p.left - p.right), h = Math.max(1, height - p.top - p.bottom);
  const zoom = Math.min(maxZoom, Math.log2(Math.min(w / ((x1 - x0) * TILE || 1e-9), h / ((y1 - y0) * TILE || 1e-9))));
  return { center: [((x0 + x1) / 2) * 360 - 180, unY((y0 + y1) / 2)] as LngLat, zoom };
}
