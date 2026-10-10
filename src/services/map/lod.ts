import type { Map as MlMap } from 'maplibre-gl';
import { cursor } from './stable/cursor';
import { pinnedZoom, type Pins } from './stable/pins';

/** how many levels finer than the view tiles may be pulled to hold one detail level through a zoom; each level = 4× tiles */
export const MAX_LOD_BIAS = 2;

/**
 * detail zoom of the current timeline stretch; 0 in editing mode. `stable` (export): each ground/water leg loads one
 * tile level per source for its whole length (`legLevels`, applied as `forced`); air legs pin each place's level
 * (`pins`, used while `usePins`); the intro and outro load one level per frame
 */
export interface LodState {
  detail: number; stable?: boolean;
  pins?: Record<string, Pins>; usePins?: boolean;
  legLevels?: (Record<string, number> | undefined)[]; forced?: Record<string, number>;
}

export const lodBias = (map: MlMap, lod: LodState) => Math.min(MAX_LOD_BIAS, Math.max(0, lod.detail - map.getZoom()));

/** run on every style load: sources are recreated with the style */
export function installLod(map: MlMap, lod: LodState) {
  lod.pins = lod.legLevels = lod.forced = undefined;
  for (const id of Object.keys(map.getStyle().sources)) {
    // calculateTileZoom is internal to MapLibre's source classes, absent from the public typing
    const src = map.getSource(id) as unknown as { type?: string; calculateTileZoom: (z: number, ...rest: [number, number, number, number]) => number } | undefined;
    if (!src || !['raster', 'raster-dem', 'vector'].includes(src.type ?? '')) continue;
    // MapLibre's own tile-zoom function, fetched via the public API rather than copied, then nudged up by the bias
    map.setSourceTileLodParams(9.314, 3, id);
    const base = src.calculateTileZoom;
    src.calculateTileZoom = (z, tile2d, dz, center3d, fov) => {
      const forced = lod.forced?.[id];
      if (forced !== undefined) return forced;
      // stable: one level per frame, the centre's, so the far ground gets no coarser band; pins hold detail through zooms
      const level = lod.stable
        ? base(z, Math.sqrt(Math.max(0, center3d * center3d - dz * dz)), dz, center3d, fov)
        : base(z + lodBias(map, lod), tile2d, dz, center3d, fov);
      const pins = lod.usePins ? lod.pins?.[id] : undefined;
      if (!pins) return level;
      cursor.calls++;
      if (tile2d !== cursor.d) return level;
      cursor.hits++;
      return pinnedZoom(pins, cursor.z, cursor.x, cursor.y, level);
    };
  }
}
