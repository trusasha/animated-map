import type { Map as MlMap } from 'maplibre-gl';
import type { Padding } from '../types';

const TILE = 512;
const RAD = Math.PI / 180;

/**
 * zoom at which the Home globe's outline has a radius of 0.4 of the free area's short side (0.42
 * when a bottom sheet leaves the top free). MapLibre's globe radius is worldSize / 2π / cos(lat),
 * and its perspective camera, d = h / 2 / tan(fov / 2) from the surface, draws an outline of
 * d·R / √(d² + 2dR); solved here for R.
 */
export function homeZoom(map: MlMap, p: Padding) {
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  const free = Math.max(1, Math.min(w - p.left - p.right, h - p.top - p.bottom));
  const r = (p.bottom > 0 ? 0.42 : 0.4) * free;
  const d = h / 2 / Math.tan((map.getVerticalFieldOfView() * RAD) / 2);
  const radius = (r * r + r * Math.sqrt(r * r + d * d)) / d;
  const cos = Math.cos(Math.min(Math.abs(map.getCenter().lat), 85) * RAD);
  return Math.log2((radius * 2 * Math.PI * cos) / TILE);
}
