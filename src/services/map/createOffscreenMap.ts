import * as maplibregl from 'maplibre-gl';
import type { MapOverlay3D } from '../../domain/overlay3d';
import type { MapStyle } from '../../domain/types';
import { MapPlayer } from './player';
import { EXPORT_TILE_CACHE_SIZE, TILE_CACHE_ZOOM_LEVELS } from './styles/hosts';
import { installImageResolver } from './styles/imageResolver';
import { loadStyle } from './styles/loadStyle';
import type { OffscreenMap } from './types';

export function idle(map: maplibregl.Map, ms = 8000) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    map.once('idle', () => { clearTimeout(timer); resolve(); });
  });
}

/** a non-interactive map whose canvas can be read back frame by frame (video export) */
export async function createOffscreenMap(host: HTMLElement, opts: { style: MapStyle; pixelRatio: number; stableTiles?: boolean }, overlay: MapOverlay3D): Promise<OffscreenMap> {
  const map = new maplibregl.Map({
    container: host, style: await loadStyle(opts.style), interactive: false, attributionControl: false, fadeDuration: 0, pixelRatio: opts.pixelRatio,
    maxTileCacheZoomLevels: TILE_CACHE_ZOOM_LEVELS, maxTileCacheSize: EXPORT_TILE_CACHE_SIZE,
    canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
  });
  const destroy = () => { overlay.dispose(); map.remove(); };
  try {
    installImageResolver(map);
    const player = new MapPlayer(map, overlay, { stableTiles: opts.stableTiles });
    await new Promise((r) => map.once('load', r));
    return { player, idle: (ms) => idle(map, ms), canvas: () => map.getCanvas(), destroy };
  } catch (e) {
    destroy();
    throw e;
  }
}
