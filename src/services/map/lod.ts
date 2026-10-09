import type { Map as MlMap } from 'maplibre-gl';
import { cursor, trackCoveringTiles } from './stable/cursor';
import { pinnedZoom, type Pins } from './stable/pins';

/** how many levels finer than the view tiles may be pulled to hold one detail level through a zoom; each level = 4× tiles */
export const MAX_LOD_BIAS = 2;

/**
 * detail zoom of the current timeline stretch; 0 in editing mode. `stable`: preloading pins each place's tile level
 * for the whole timeline (`pins`, per source), so the ground never swaps imagery mid-video
 */
export interface LodState { detail: number; stable?: boolean; pins?: Record<string, Pins> }

export const lodBias = (map: MlMap, lod: LodState) => Math.min(MAX_LOD_BIAS, Math.max(0, lod.detail - map.getZoom()));

/** run on every style load: sources are recreated with the style */
export function installLod(map: MlMap, lod: LodState) {
  lod.pins = undefined;
  if (lod.stable) trackCoveringTiles(map);
  for (const id of Object.keys(map.getStyle().sources)) {
    // calculateTileZoom is internal to MapLibre's source classes, absent from the public typing
    const src = map.getSource(id) as unknown as { type?: string; calculateTileZoom: (z: number, ...rest: [number, number, number, number]) => number } | undefined;
    if (!src || !['raster', 'raster-dem', 'vector'].includes(src.type ?? '')) continue;
    // MapLibre's own tile-zoom function, fetched via the public API rather than copied, then nudged up by the bias
    map.setSourceTileLodParams(9.314, 3, id);
    const base = src.calculateTileZoom;
    src.calculateTileZoom = (z, ...rest) => {
      // pins hold the detail through a zoom on their own
      const level = base(z + (lod.stable ? 0 : lodBias(map, lod)), ...rest);
      const pins = lod.pins?.[id];
      return pins && rest[0] === cursor.d ? pinnedZoom(pins, cursor.z, cursor.x, cursor.y, level) : level;
    };
  }
}
