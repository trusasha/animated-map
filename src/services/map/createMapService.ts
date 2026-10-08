import * as maplibregl from 'maplibre-gl';
import type { MapOverlay3D } from '../../domain/overlay3d';
import type { LngLat, MapStyle } from '../../domain/types';
import { MapPlayer } from './player';
import { GLYPHS, TILE_CACHE_ZOOM_LEVELS } from './styles/hosts';
import { installImageResolver } from './styles/imageResolver';
import { loadStyle } from './styles/loadStyle';
import type { MapService } from './types';

/** the interactive map; owns the container and the MapLibre instance, starts on the satellite style */
export function createMapService(container: HTMLElement, overlay: MapOverlay3D): MapService {
  // glyphs: the player's label layer is installed on this placeholder style too
  const placeholder: maplibregl.StyleSpecification = { version: 8, glyphs: GLYPHS, sources: {}, layers: [] };
  const map = new maplibregl.Map({
    container, style: placeholder, center: [20, 30], zoom: 1.4,
    maxTileCacheZoomLevels: TILE_CACHE_ZOOM_LEVELS, canvasContextAttributes: { antialias: true },
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  installImageResolver(map);
  const player = new MapPlayer(map, overlay);
  const loaded = new Promise<void>((r) => map.once('load', () => r()));

  let current: MapStyle | undefined;
  const setStyle = async (s: MapStyle) => {
    if (s === current) return;
    current = s;
    const spec = await loadStyle(s);
    // a newer setStyle won the race
    if (current !== s) return;
    await loaded;
    const applied = new Promise<void>((r) => map.once('style.load', () => r()));
    map.setStyle(spec, { diff: false });
    await applied;
  };
  const first = setStyle('satellite');

  return {
    player,
    whenLoaded: () => Promise.all([loaded, first]).then(() => undefined),
    setStyle,
    setContext: (paths) => player.setContext(paths),
    select: (i) => player.select(i),
    fitBounds(points, { padding, maxZoom, duration }) {
      if (!points.length) return;
      const b = new maplibregl.LngLatBounds();
      for (const p of points) b.extend(p);
      map.fitBounds(b, { padding, maxZoom, pitch: 0, duration });
    },
    onClick(cb) {
      const h = (e: maplibregl.MapMouseEvent) => cb([e.lngLat.lng, e.lngLat.lat]);
      map.on('click', h);
      return () => { map.off('click', h); };
    },
    setCursor: (c) => { map.getCanvas().style.cursor = c; },
    addDraggableMarker(p: LngLat, onDragEnd) {
      const marker = new maplibregl.Marker({ draggable: true, color: '#ff4d6d' }).setLngLat(p).addTo(map);
      marker.on('dragend', () => { const q = marker.getLngLat(); onDragEnd([q.lng, q.lat]); });
      return () => { marker.remove(); };
    },
    project(p) {
      const { x, y } = map.project(p);
      return [x, y];
    },
    destroy() {
      player.stop();
      overlay.dispose();
      map.remove();
    },
  };
}
