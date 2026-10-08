import * as maplibregl from 'maplibre-gl';
import type { MapOverlay3D } from '../../domain/overlay3d';
import type { LngLat, MapStyle } from '../../domain/types';
import { createCamera } from './camera';
import { installTripsLayer, setTrips } from './home/tripsLayer';
import { startSpin } from './home/spin';
import { homeZoom } from './home/zoom';
import { installEditorLayers, setEditorSegments } from './layers/editorLayers';
import { applyVisibility } from './layers/visibility';
import { createMarkers } from './markers';
import { installPointer } from './pick';
import { MapPlayer, OVERLAY_LAYER } from './player';
import { probe } from './probe';
import { GLYPHS, TILE_CACHE_ZOOM_LEVELS } from './styles/hosts';
import { installImageResolver } from './styles/imageResolver';
import { loadStyle } from './styles/loadStyle';
import type { EditorRouteView, HomeTrip, MapMode, MapService } from './types';

const NO_ROUTE: EditorRouteView = { segments: [], stops: [], selected: null };

const subscribe = <T>(set: Set<T>, cb: T) => { set.add(cb); return () => { set.delete(cb); }; };

/** the interactive map; owns the container and the MapLibre instance, starts on the satellite style */
export function createMapService(container: HTMLElement, overlay: MapOverlay3D): MapService {
  // glyphs: the player's label layer is installed on this placeholder style too
  const placeholder: maplibregl.StyleSpecification = { version: 8, glyphs: GLYPHS, sources: {}, layers: [] };
  const map = new maplibregl.Map({
    container, style: placeholder, center: [20, 30], zoom: 1.4,
    maxTileCacheZoomLevels: TILE_CACHE_ZOOM_LEVELS, canvasContextAttributes: { antialias: true },
    attributionControl: false,
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  // compact attribution opens itself on first render and then covers the panels' tap targets on phones
  map.once('load', () => container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));
  installImageResolver(map);
  const player = new MapPlayer(map, overlay);
  const camera = createCamera(map);
  const loaded = new Promise<void>((r) => map.once('load', () => r()));

  const on = { segment: new Set<(i: number) => void>(), empty: new Set<() => void>(), drag: new Set<(i: number, p: LngLat) => void>() };
  const markers = createMarkers(map, (i, p) => on.drag.forEach((cb) => cb(i, p)));
  let mode: MapMode = 'editor';
  let editing = true;
  let route = NO_ROUTE;
  let trips: HomeTrip[] = [];
  let highlighted: string | null = null;
  let stopSpin: (() => void) | undefined;

  const refresh = () => {
    applyVisibility(map, mode, editing);
    markers.show(mode === 'editor' && editing);
  };
  player.onEditing = (e) => {
    editing = e;
    camera.suspend(!e);
    refresh();
  };
  // registered after the player's own style.load handler, so the overlay layer already exists
  map.on('style.load', () => {
    installTripsLayer(map, OVERLAY_LAYER);
    installEditorLayers(map, OVERLAY_LAYER);
    setTrips(map, trips, highlighted);
    setEditorSegments(map, route.segments, route.selected);
    refresh();
  });
  const pointer = installPointer(map, {
    active: () => mode === 'editor' && editing,
    segment: (i) => on.segment.forEach((cb) => cb(i)),
    empty: () => on.empty.forEach((cb) => cb()),
  });

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
      stopSpin?.();
      markers.clear();
      player.stop();
      overlay.dispose();
      map.remove();
    },

    setMode(m) {
      if (m === 'home') {
        pointer.cancel();
        player.clear();
        player.select(null);
        route = NO_ROUTE;
        setEditorSegments(map, [], null);
        markers.clear();
      }
      mode = m;
      refresh();
    },
    setEditorRoute(view) {
      if (view.selected !== route.selected) player.select(view.selected);
      route = view;
      setEditorSegments(map, view.segments, view.selected);
      markers.set(view.stops);
    },
    onSegmentClick: (cb) => subscribe(on.segment, cb),
    onEmptyClick: (cb) => subscribe(on.empty, cb),
    onStopDrag: (cb) => subscribe(on.drag, cb),
    startPick: (onPick) => pointer.start(onPick),
    setHomeTrips(t) {
      trips = t;
      setTrips(map, trips, highlighted);
    },
    highlightTrip(id) {
      highlighted = id;
      setTrips(map, trips, highlighted);
    },
    setSpin(spin) {
      if (spin && !stopSpin) stopSpin = startSpin(map, () => mode === 'home' && highlighted === null);
      if (!spin) { stopSpin?.(); stopSpin = undefined; }
    },

    setHomePadding: (p) => camera.setPadding(p, homeZoom(map, p)),
    setPadding: (p) => camera.setPadding(p),
    resetPadding: () => camera.resetPadding(),
    getPadding: () => camera.getPadding(),
    fitTo: (points, o) => camera.fitTo(points, o),
    flyTo: (v, o) => camera.flyTo(v, o),
    jumpTo: (v) => camera.jumpTo(v),
    probe: () => probe(map, camera.getPadding(), markers.visible),
  };
}
