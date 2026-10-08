import type { Map as MlMap } from 'maplibre-gl';
import type { Padding } from '../types';

const TILE = 512;

/**
 * zoom at which the Home globe's radius is 0.4 of the free area's short side (0.42 when a bottom
 * sheet leaves the top free); MapLibre's globe radius is worldSize / 2π, shrunk by cos(latitude)
 */
export function homeZoom(map: MlMap, p: Padding) {
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  const free = Math.max(1, Math.min(w - p.left - p.right, h - p.top - p.bottom));
  const radius = (p.bottom > 0 ? 0.42 : 0.4) * free;
  const cos = Math.cos((map.getCenter().lat * Math.PI) / 180);
  return Math.log2((radius * 2 * Math.PI) / (TILE * Math.max(cos, 0.1)));
}
