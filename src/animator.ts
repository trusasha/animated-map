import * as maplibregl from 'maplibre-gl';
import type { CustomLayerInterface, GeoJSONSource, HillshadeLayerSpecification, RasterDEMSourceSpecification, StyleSpecification } from 'maplibre-gl';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { animateFigure, createFigure, figureKey } from './figures';
import { UKIYOE_HILLSHADE, ukiyoePattern, ukiyoeStyle } from './ukiyoe';
import { buildTimeline, detailZoom, FIG_PX, sample, slicePath, type Bounds, type Frame, type LegInput, type Timeline, type TLeg } from './timeline';
import type { LngLat, MapStyle, Mode, Stop } from './types';

const R = 6371008.8;
const rad = Math.PI / 180;
export const MODE_COLOR: Record<Mode, string> = { air: '#ffffff', ground: '#ffb703', water: '#4cc9f0' };
const HIGHLIGHT = '#ff4d6d';
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

// same tiles under several hostnames: all are HTTP/1.1, so each extra host adds 6 parallel connections
const DEM = ['s3.amazonaws.com/elevation-tiles-prod', 'elevation-tiles-prod.s3.amazonaws.com', 'elevation-tiles-prod.s3.us-east-1.amazonaws.com']
  .map((h) => `dem://${h}/terrarium/{z}/{x}/{y}.png`);
const ESRI_HOSTS = ['server', 'services'].map((h) => `https://${h}.arcgisonline.com/ArcGIS/rest/services`);
const EXAGGERATION = 1.5;

// Terrarium carries bathymetry: without flattening, oceans sink into trenches and ships sail underwater
maplibregl.addProtocol('dem', async ({ url }, ctrl) => {
  const res = await fetch(url.replace('dem://', 'https://'), { signal: ctrl.signal });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  const img = ctx.getImageData(0, 0, bmp.width, bmp.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) if (d[i] < 128) { d[i] = 128; d[i + 1] = 0; d[i + 2] = 0; }
  return { data: await createImageBitmap(img) };
});

const SKY = {
  'sky-color': '#0b1636', 'horizon-color': '#9cc9ff', 'fog-color': '#d6e8ff',
  'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.85,
  'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 8, 0],
} as const;

export async function loadStyle(style: MapStyle): Promise<StyleSpecification> {
  const base: StyleSpecification = style === 'satellite'
    ? {
      version: 8, glyphs: GLYPHS,
      sources: {
        sat: { type: 'raster', tiles: ESRI_HOSTS.map((h) => `${h}/World_Imagery/MapServer/tile/{z}/{y}/{x}`), tileSize: 256, maxzoom: 19, attribution: 'Esri, Maxar, Earthstar Geographics' },
        ref: { type: 'raster', tiles: ESRI_HOSTS.map((h) => `${h}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`), tileSize: 256, maxzoom: 19 },
      },
      layers: [{ id: 'sat', type: 'raster', source: 'sat' }, { id: 'ref', type: 'raster', source: 'ref', paint: { 'raster-opacity': 0.85 } }],
    }
    : style === 'ukiyoe' ? ukiyoeStyle(GLYPHS)
    : await (await fetch(`https://tiles.openfreemap.org/styles/${style === 'dark' ? 'dark' : 'liberty'}`)).json();
  for (const l of base.layers) if (l.type === 'raster') l.paint = { ...l.paint, 'raster-fade-duration': 0 };
  const dem = (attribution?: string): RasterDEMSourceSpecification => ({ type: 'raster-dem', tiles: DEM, encoding: 'terrarium', tileSize: 256, maxzoom: 12, ...(attribution && { attribution }) });
  const hillshade: HillshadeLayerSpecification = { id: 'hillshade', type: 'hillshade', source: 'hill', paint: style === 'ukiyoe' ? UKIYOE_HILLSHADE : { 'hillshade-exaggeration': style === 'satellite' ? 0.25 : 0.45, 'hillshade-shadow-color': '#1c2230' } };
  // over land/water fills (opaque, would hide it), under roads, buildings and labels
  const at = style === 'satellite' ? 1 : base.layers.findIndex((l) => l.type === 'symbol' || /building|aeroway|road|highway|tunnel|bridge|transportation/.test(l.id));
  const layers = [...base.layers];
  layers.splice(at < 0 ? layers.length : at, 0, hillshade);
  return {
    // hillshade on the terrain source makes MapLibre warn and render it coarser
    ...base, layers, sources: { ...base.sources, dem: dem('Terrain: Mapzen, AWS'), hill: dem() },
    terrain: { source: 'dem', exaggeration: EXAGGERATION },
    projection: { type: 'globe' }, sky: SKY as any,
  };
}

/** the default (5) evicts most of a route's warm-up before playback reaches it */
export const TILE_CACHE_ZOOM_LEVELS = 200;
const PRELOAD_STEP = 1 / 15;
const FETCH_PARALLEL = 24;
const TILE_TIMEOUT_MS = 10_000;
/** how many levels finer than the view tiles may be pulled to hold one detail level through a zoom; each level = 4× tiles */
const MAX_LOD_BIAS = 2;
/** seconds of timeline that must be cached before playback starts; the rest streams in behind */
export const BUFFER_AHEAD = 10;

/**
 * camera samples for planning tiles (px, zoom, pitch°, max step s): consecutive views overlap by ~3/4 of the
 * screen and the detail lock keeps tile levels steady between them, so nothing in between is missed
 */
const FINE = [250, 0.25, 5, PRELOAD_STEP * 4] as const;
function preloadTimes(tl: Timeline, [px, dz, dp, step]: readonly [number, number, number, number]) {
  const merc = ({ center: [x, y], zoom }: Frame['camera']) =>
    [(x / 360) * 512 * 2 ** zoom, (Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, y)) * rad) / 2)) / (2 * Math.PI)) * 512 * 2 ** zoom];
  const far = (a: Frame['camera'], b: Frame['camera']) => {
    const z = Math.max(a.zoom, b.zoom), pa = merc({ ...a, zoom: z }), pb = merc({ ...b, zoom: z });
    return Math.abs(a.zoom - b.zoom) > dz || Math.abs(a.pitch - b.pitch) > dp || Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) > px;
  };
  const times = [0];
  for (let t = 0; t < tl.duration;) {
    const a = sample(tl, t).camera;
    let dt = step;
    while (dt > 0.002 && far(a, sample(tl, t + dt).camera)) dt /= 2;
    times.push((t = Math.min(t + dt, tl.duration)));
  }
  return times;
}

export function idle(map: maplibregl.Map, ms = 8000) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    map.once('idle', () => { clearTimeout(timer); resolve(); });
  });
}

const wrapLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

function mercatorFit(w: number, h: number, b: Bounds) {
  const my = (lat: number) => (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * Math.PI) / 360))) / 360;
  const x0 = (b[0] + 180) / 360, x1 = (b[2] + 180) / 360, y0 = my(b[3]), y1 = my(b[1]);
  const pad = 0.14;
  const zoom = Math.log2(Math.min((w * (1 - 2 * pad)) / (Math.max(x1 - x0, 1e-7) * 512), (h * (1 - 2 * pad)) / (Math.max(y1 - y0, 1e-7) * 512)));
  const cy = (y0 + y1) / 2;
  const lat = (360 / Math.PI) * Math.atan(Math.exp(((180 - cy * 360) * Math.PI) / 180)) - 90;
  return { zoom, center: [(b[0] + b[2]) / 2, lat] as LngLat };
}

function globeWorld(lng: number, lat: number, alt: number) {
  const k = 1 + alt / R, c = Math.cos(lat * rad);
  return new THREE.Vector3(Math.sin(lng * rad) * c * k, Math.sin(lat * rad) * k, Math.cos(lng * rad) * c * k);
}

function mercWorld(lng: number, lat: number, alt: number) {
  const m = maplibregl.MercatorCoordinate.fromLngLat({ lng, lat }, alt);
  return new THREE.Vector3(m.x, m.y, m.z);
}

/** local east-north-up meters → unit-sphere globe space */
function enuToGlobe(lng: number, lat: number) {
  const l = lng * rad, p = lat * rad;
  const east = new THREE.Vector3(Math.cos(l), 0, -Math.sin(l)).divideScalar(R);
  const north = new THREE.Vector3(-Math.sin(l) * Math.sin(p), Math.cos(p), -Math.cos(l) * Math.sin(p)).divideScalar(R);
  const up = globeWorld(lng, lat, 0);
  return new THREE.Matrix4().makeBasis(east, north, up.clone().divideScalar(R)).setPosition(up);
}

/** local east-north-up meters → mercator [0..1] space (y grows south) */
function enuToMerc(lng: number, lat: number) {
  const m = maplibregl.MercatorCoordinate.fromLngLat({ lng, lat }, 0);
  const s = m.meterInMercatorCoordinateUnits();
  return new THREE.Matrix4().set(s, 0, 0, m.x, 0, -s, 0, m.y, 0, 0, s, 0, 0, 0, 0, 1);
}

// three caches an instanced geometry's draw count on first render, so a growing line needs a fresh geometry
function setLine(l: Line2, positions: number[]) {
  l.geometry.dispose();
  l.geometry = new LineGeometry().setPositions(positions);
}

interface Arc { leg: TLeg; index: number; planned: Line2; casing: Line2; done: Line2 }
interface Prefetch { tl: Timeline; buffered: number }

export class Animator {
  tl?: Timeline;
  frame?: Frame;
  stops: Stop[] = [];
  onFrame?: (t: number) => void;
  private figures = new Map<string, THREE.Group>();
  private loading = new Map<string, Promise<void>>();
  private figScene = new THREE.Scene();
  private arcScene = new THREE.Scene();
  private camera = new THREE.Camera();
  private renderer?: THREE.WebGLRenderer;
  private arcs: Arc[] = [];
  private occluder = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), new THREE.MeshBasicMaterial({ colorWrite: false }));
  private visited = -1;
  private raf = 0;
  private run = 0;
  private prefetch?: Prefetch;
  /** detail zoom of the current timeline stretch; 0 in editing mode */
  private detail = 0;
  private lodBias = () => Math.min(MAX_LOD_BIAS, Math.max(0, this.detail - this.map.getZoom()));
  private waiting = false;
  /** playback caught up with the tile download and is holding */
  onBuffering?: (waiting: boolean) => void;
  private selected: number | null = null;
  private context: LngLat[][] = [];
  private contextShown = true;
  time = 0;

  constructor(public map: maplibregl.Map) {
    map.setMissingStyleImageResolver((id) => {
      const img = ukiyoePattern(id);
      if (img && !map.hasImage(id)) map.addImage(id, img);
    });
    this.figScene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(0.4, -0.6, 1);
    this.figScene.add(sun);
    this.occluder.renderOrder = -1;
    this.arcScene.add(this.occluder);
    map.on('style.load', () => this.install());
    // the tile set depends on the viewport
    map.on('resize', () => { this.prefetch = undefined; });
  }

  fit = (b: Bounds) => {
    const c = this.map.getContainer();
    return mercatorFit(c.clientWidth, c.clientHeight, b);
  };

  private install() {
    const map = this.map;
    const empty = { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection;
    for (const id of ['context', 'route', 'highlight', 'trail', 'stops']) map.addSource(id, { type: 'geojson', data: empty });
    map.addLayer({ id: 'context', type: 'line', source: 'context', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#c8d0dc', 'line-width': 2, 'line-opacity': 0.35, 'line-dasharray': [1, 2] } });
    const color = ['match', ['get', 'mode'], 'air', MODE_COLOR.air, 'water', MODE_COLOR.water, MODE_COLOR.ground] as any;
    map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': color, 'line-width': 2.5, 'line-opacity': 0.45, 'line-dasharray': [1.5, 1.5] } });
    map.addLayer({ id: 'highlight-glow', type: 'line', source: 'highlight', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 16, 'line-opacity': 0.35, 'line-blur': 6 } });
    map.addLayer({ id: 'highlight', type: 'line', source: 'highlight', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': HIGHLIGHT, 'line-width': 6 } });
    map.addLayer({ id: 'trail-casing', type: 'line', source: 'trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#000', 'line-width': 8, 'line-opacity': 0.35, 'line-blur': 2 } });
    map.addLayer({ id: 'trail', type: 'line', source: 'trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': color, 'line-width': 4.5 } });
    map.addLayer({ id: 'stops', type: 'circle', source: 'stops', paint: { 'circle-radius': 6, 'circle-color': ['case', ['get', 'visited'], '#ff4d6d', '#ffffff'], 'circle-stroke-color': '#0b0f17', 'circle-stroke-width': 2 } });
    map.addLayer({
      id: 'stop-labels', type: 'symbol', source: 'stops',
      layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 14, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-allow-overlap': true },
      paint: { 'text-color': '#ffffff', 'text-halo-color': '#0b0f17', 'text-halo-width': 1.6 },
    });
    map.addLayer(this.threeLayer());
    for (const id of Object.keys(map.getStyle().sources)) {
      const src = map.getSource(id) as any;
      if (!['raster', 'raster-dem', 'vector'].includes(src?.type)) continue;
      // MapLibre's own tile-zoom function, fetched via the public API rather than copied, then nudged up by the bias
      map.setSourceTileLodParams(9.314, 3, id);
      const base = src.calculateTileZoom;
      src.calculateTileZoom = (z: number, ...rest: [number, number, number, number]) => base(z + this.lodBias(), ...rest);
    }
    this.prefetch = undefined;
    this.visited = -1;
    this.contextShown = true;
    this.refreshStatic();
    this.setContext(this.context);
    if (this.tl && this.frame) this.setFrame(this.time);
  }

  private threeLayer(): CustomLayerInterface {
    return {
      id: 'three', type: 'custom', renderingMode: '3d',
      onAdd: (map, gl) => {
        // style reloads re-add the layer on the same canvas/context
        this.renderer ??= new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl });
        this.renderer.autoClear = false;
      },
      render: (gl, args) => this.renderThree(gl, args.defaultProjectionData as any),
    };
  }

  /** Requires legs with computed paths. */
  async setTrip(stops: Stop[], legs: LegInput[], speed: number) {
    this.stops = stops;
    this.tl = legs.length ? buildTimeline(stops, legs, speed, this.fit) : undefined;
    for (const { figure } of legs) {
      const key = figureKey(figure);
      if (!this.loading.has(key)) this.loading.set(key, createFigure(figure).then((g) => {
        g.matrixAutoUpdate = false;
        g.visible = false;
        g.traverse((o) => { o.frustumCulled = false; });
        const old = this.figures.get(figure);
        if (old) this.figScene.remove(old);
        this.figures.set(figure, g);
        this.figScene.add(g);
      }));
    }
    await Promise.all(legs.map((l) => this.loading.get(figureKey(l.figure))));
    for (const a of this.arcs) for (const l of [a.planned, a.casing, a.done]) { this.arcScene.remove(l); l.geometry.dispose(); }
    // same widths as the ground/water trail layers
    this.arcs = (this.tl?.legs ?? []).flatMap((leg, index) => leg.mode !== 'air' ? [] : [{
      leg, index,
      planned: this.line(0xb9c4d2, 3, 0),
      casing: this.line(0x1c2230, 7.5, 1),
      done: this.line(0xffffff, 4.5, 2),
    }]);
    for (const a of this.arcs) this.arcScene.add(a.planned, a.casing, a.done);
    this.visited = -1;
    this.refreshStatic();
  }

  // opaque on purpose: translucent Line2 segments overlap at joints and render as beads
  private line(color: number, width: number, order: number) {
    const l = new Line2(new LineGeometry(), new LineMaterial({ color, linewidth: width, depthWrite: order === 2 }));
    l.frustumCulled = false;
    l.renderOrder = order;
    l.userData.width = width;
    l.userData.color = color;
    return l;
  }

  private refreshStatic() {
    const src = this.map.getSource('route') as GeoJSONSource | undefined;
    if (!src) return;
    const legs = this.tl?.legs ?? [];
    src.setData({
      type: 'FeatureCollection',
      features: legs.filter((l) => l.mode !== 'air').map((l) => ({ type: 'Feature', properties: { mode: l.mode }, geometry: { type: 'LineString', coordinates: l.path } })),
    });
    this.showContext(!this.frame);
    const sel = !this.frame && this.selected !== null ? legs[this.selected] : undefined;
    (this.map.getSource('highlight') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: sel && sel.mode !== 'air' ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: sel.path } }] : [],
    });
    this.setStops(this.frame ? this.visited : this.stops.length);
    if (!this.frame) (this.map.getSource('trail') as GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
  }

  private setStops(visited: number) {
    (this.map.getSource('stops') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: this.stops.map((s, i) => ({ type: 'Feature', properties: { name: s.name, visited: i < visited }, geometry: { type: 'Point', coordinates: [s.lng, s.lat] } })),
    });
  }

  /** null = editing mode: no figure, whole route visible */
  setFrame(t: number | null) {
    const tl = this.tl;
    if (t === null || !tl) {
      this.frame = undefined;
      this.detail = 0;
      this.refreshStatic();
      this.map.triggerRepaint();
      return;
    }
    this.time = Math.max(0, Math.min(t, tl.duration));
    const f = (this.frame = sample(tl, this.time));
    this.detail = detailZoom(tl, this.time);
    this.showContext(false);
    const features: GeoJSON.Feature[] = [];
    tl.legs.forEach((leg, i) => {
      if (leg.mode === 'air' || i > f.legIndex) return;
      const coords = i < f.legIndex ? leg.path : slicePath(leg, f.progress).map(([x, y]) => [x, y]);
      if (coords.length > 1) features.push({ type: 'Feature', properties: { mode: leg.mode }, geometry: { type: 'LineString', coordinates: coords } });
    });
    (this.map.getSource('trail') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features });
    const visited = f.legIndex + (f.progress >= 1 ? 2 : 1);
    if (visited !== this.visited) { this.visited = visited; this.setStops(visited); }
    this.jump(f.camera);
    this.map.triggerRepaint();
    this.onFrame?.(this.time);
  }

  play(from = this.time >= (this.tl?.duration ?? 0) ? 0 : this.time) {
    this.stop();
    let last = performance.now(), t = from;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const hold = !!this.tl && t + dt > this.buffered && this.buffered < this.tl.duration;
      if (!hold) t += dt;
      if (hold !== this.waiting) { this.waiting = hold; this.onBuffering?.(hold); }
      this.raf = this.tl && t < this.tl.duration ? requestAnimationFrame(tick) : 0;
      this.setFrame(t);
    };
    this.raf = requestAnimationFrame(tick);
  }


  /** every tile of the timeline is in the HTTP cache */
  get ready() { return !!this.tl && this.buffered >= this.tl.duration; }
  /** timeline seconds up to which every tile is cached */
  get buffered() { return this.tl && this.prefetch?.tl === this.tl ? this.prefetch.buffered : -1; }

  /** rest of the route outside the video, drawn faint for orientation */
  setContext(paths: LngLat[][]) {
    this.context = paths;
    (this.map.getSource('context') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: paths.map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: p } })),
    });
  }

  // the video never shows the rest of the route, so the preview must not either
  private showContext(on: boolean) {
    if (on === this.contextShown || !this.map.getLayer('context')) return;
    this.contextShown = on;
    this.map.setLayoutProperty('context', 'visibility', on ? 'visible' : 'none');
  }

  /** editing mode only: outlines one leg on the map, null clears */
  select(index: number | null) {
    this.selected = index;
    this.refreshStatic();
    this.map.triggerRepaint();
  }

  private jump(c: Frame['camera']) {
    this.map.jumpTo({ center: [wrapLng(c.center[0]), c.center[1]], zoom: c.zoom, pitch: c.pitch, bearing: 0 });
  }

  /** every tile URL the camera will need over the whole timeline; moves the camera without rendering */
  /** tile URLs in timeline order; cuts[k] = how many of them cover everything up to times[k] */
  private async plannedTiles(tl: Timeline, alive: () => boolean, onProgress: (p: number) => void) {
    const sources = Object.keys(this.map.getStyle().sources).map((id) => this.map.getSource(id) as any).filter((s) => s?.tiles);
    const urls = new Set<string>();
    const times = preloadTimes(tl, FINE), cuts: number[] = [];
    const terrain = (this.map as any).terrain;
    const detail = this.detail;
    for (const [i, t] of times.entries()) {
      this.jump(sample(tl, t).camera);
      this.detail = detailZoom(tl, t);
      for (const s of sources) {
        // raster rounds the zoom, vector floors it; DEM serves both hillshade and terrain, which differ, so take both
        for (const roundZoom of s.type === 'raster' ? [true] : s.type === 'vector' ? [false] : [false, true]) {
          // terrain and the source's own zoom function: the same tile choice the renderer makes (public typing lacks both)
          for (const id of this.map.coveringTiles({ tileSize: s.tileSize ?? 512, minzoom: s.minzoom, maxzoom: s.maxzoom, roundZoom, terrain, calculateTileZoom: s.calculateTileZoom } as any)) {
            urls.add(id.canonical.url(s.tiles, this.map.getPixelRatio(), s.scheme).replace('dem://', 'https://'));
          }
        }
      }
      cuts.push(urls.size);
      if (i % 100 === 0) {
        onProgress(i / times.length);
        await new Promise((r) => setTimeout(r));
        if (!alive()) { this.detail = detail; return undefined; }
      }
    }
    this.detail = detail;
    return { times, cuts, urls: [...urls] };
  }

  /**
   * Streams the route's tiles into the browser's HTTP cache like a video player buffers: plans the tile set once
   * per timeline, downloads it in timeline order in the background, and resolves as soon as [from, from+ahead]
   * is cached. Playback holds at `buffered` if it catches up. False if interrupted.
   */
  async preload(onProgress: (p: number) => void, signal?: AbortSignal, ahead = BUFFER_AHEAD, from = 0) {
    const tl = this.tl;
    if (!tl) return true;
    this.stop();
    const run = this.run;
    const alive = () => run === this.run && !signal?.aborted && tl === this.tl;
    const plan = 0.3;
    if (this.prefetch?.tl !== tl) {
      const cam = { center: this.map.getCenter(), zoom: this.map.getZoom(), pitch: this.map.getPitch(), bearing: this.map.getBearing() };
      const planned = await this.plannedTiles(tl, alive, (p) => onProgress(p * plan));
      if (this.frame) this.setFrame(this.time);
      else this.map.jumpTo(cam);
      if (!planned || !alive()) return false;
      this.startFetch(tl, planned, signal);
    }
    const target = Math.min(tl.duration, from + ahead);
    while (this.buffered < target) {
      if (!alive()) return false;
      onProgress(plan + (1 - plan) * Math.max(0, (this.buffered - from) / (target - from || 1)));
      await new Promise((r) => setTimeout(r, 200));
    }
    return true;
  }

  private startFetch(tl: Timeline, { times, cuts, urls }: { times: number[]; cuts: number[]; urls: string[] }, signal?: AbortSignal) {
    const pf: Prefetch = { tl, buffered: -1 };
    this.prefetch = pf;
    const alive = () => this.prefetch === pf && !signal?.aborted;
    const done = new Uint8Array(urls.length);
    let next = 0, prefix = 0, k = -1;
    const worker = async () => {
      while (next < urls.length && alive()) {
        const i = next++;
        // a missing tile (404 over open sea etc.) is fine, MapLibre will skip it too; a hung one would stall
        // `buffered` (it only advances over a contiguous done prefix), so give up on it after a while
        const timeout = AbortSignal.timeout(TILE_TIMEOUT_MS);
        try { await (await fetch(urls[i], { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })).arrayBuffer(); } catch { /* skip */ }
        done[i] = 1;
        while (prefix < urls.length && done[prefix]) prefix++;
        while (k + 1 < cuts.length && cuts[k + 1] <= prefix) k++;
        pf.buffered = prefix === urls.length ? tl.duration : k < 0 ? -1 : times[k];
      }
    };
    for (let i = 0; i < FETCH_PARALLEL; i++) worker();
  }

  stop() { cancelAnimationFrame(this.raf); this.raf = 0; this.run++; }
  get playing() { return this.raf !== 0; }

  private renderThree(gl: WebGL2RenderingContext, data: { mainMatrix: ArrayLike<number>; fallbackMatrix: ArrayLike<number>; projectionTransition?: number }) {
    const f = this.frame, renderer = this.renderer;
    if (!renderer) return;
    for (const g of this.figures.values()) g.visible = false;
    if (!f && !this.arcs.length) return;

    const g = data.projectionTransition ?? 0;
    const merc = new THREE.Matrix4().fromArray(Array.from(g > 0 ? data.fallbackMatrix : data.mainMatrix));
    const globe = g > 0 ? new THREE.Matrix4().fromArray(Array.from(data.mainMatrix)) : null;
    const center = this.map.getCenter();
    const [lng, lat] = f ? f.pos : [center.lng, center.lat];
    // pick the mercator world copy the camera is looking at
    const copyLng = lng + Math.round((center.lng - lng) / 360) * 360;

    if (!this.figScene.environment) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      this.figScene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }
    renderer.resetState();
    renderer.setViewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.clearDepth();
    const pr = this.map.getPixelRatio();
    const elev = (p: LngLat) => this.map.queryTerrainElevation(p) ?? 0;
    // arcs ride on a straight ramp between the airports' ground heights, not on every ridge below
    const ramp = (leg: TLeg) => { const a = elev(leg.path[0]), b = elev(leg.path.at(-1)!); return (frac: number) => a + (b - a) * frac; };

    if (this.arcs.length) {
      const useGlobe = !!globe && g >= 0.5;
      const world = (x: number, y: number, a: number) => useGlobe ? globeWorld(x, y, a) : mercWorld(x - lng + copyLng, y, a);
      const origin = world(lng, lat, 0);
      this.camera.projectionMatrix.copy(useGlobe ? globe! : merc).multiply(new THREE.Matrix4().makeTranslation(origin));
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
      this.occluder.visible = useGlobe;
      this.occluder.position.copy(origin).negate();
      for (const a of this.arcs) {
        const base = ramp(a.leg);
        const flat = (frac: number) => slicePath(a.leg, frac).flatMap(([x, y, alt], k, all) =>
          world(x, y, alt + base(k === all.length - 1 ? frac : a.leg.cum[k] / (a.leg.length || 1))).sub(origin).toArray());
        const done = !f ? 0 : a.index < f.legIndex ? 1 : a.index === f.legIndex ? f.progress : 0;
        setLine(a.planned, flat(1));
        a.done.visible = a.casing.visible = done > 0.002;
        if (a.done.visible) {
          const pts = flat(done);
          setLine(a.done, pts);
          setLine(a.casing, pts);
        }
        const lit = !f && a.index === this.selected;
        a.planned.material.color.set(lit ? HIGHLIGHT : a.planned.userData.color);
        for (const l of [a.planned, a.casing, a.done]) {
          l.material.resolution.set(gl.drawingBufferWidth, gl.drawingBufferHeight);
          l.material.linewidth = (lit && l === a.planned ? 6 : l.userData.width) * pr;
        }
      }
      renderer.render(this.arcScene, this.camera);
      renderer.clearDepth();
    }

    const fig = f && this.figures.get(f.figure);
    if (!f || !fig || f.scale <= 0.001) return;
    const P = merc.clone().multiply(enuToMerc(copyLng, lat));
    if (globe) {
      const pg = globe.clone().multiply(enuToGlobe(lng, lat));
      P.elements.forEach((v, i) => { P.elements[i] = v + (pg.elements[i] - v) * g; });
    }
    this.camera.projectionMatrix.copy(P);
    this.camera.projectionMatrixInverse.copy(P).invert();

    const th = f.heading * rad + f.spin, c = Math.max(-25, Math.min(25, f.climb)) * rad;
    const fwd = new THREE.Vector3(Math.cos(c) * Math.sin(th), Math.cos(c) * Math.cos(th), Math.sin(c));
    const up = new THREE.Vector3(-Math.sin(c) * Math.sin(th), -Math.sin(c) * Math.cos(th), Math.cos(c));
    const right = up.clone().cross(fwd);
    const size = (FIG_PX * 2 * Math.PI * R * Math.cos(lat * rad)) / (512 * 2 ** this.map.getZoom());
    const leg = this.tl!.legs[f.legIndex];
    const ground = f.mode === 'air' && leg.mode === 'air' ? ramp(leg)(f.progress) : elev(f.pos);
    fig.matrix.makeBasis(right, up, fwd).scale(new THREE.Vector3().setScalar(size * f.scale)).setPosition(0, 0, f.alt + ground);
    fig.matrixWorldNeedsUpdate = true;
    fig.visible = true;
    animateFigure(fig, this.time);
    renderer.render(this.figScene, this.camera);
  }
}
