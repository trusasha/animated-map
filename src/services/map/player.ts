import type { CustomLayerInterface, Map as MlMap } from 'maplibre-gl';
import type { MapOverlay3D, OverlayContext, ProjectionData } from '../../domain/overlay3d';
import { buildTimeline, detailZoom, sample, type FitFn, type Frame, type LegInput, type Timeline } from '../../domain/timeline';
import type { LngLat, Stop } from '../../domain/types';
import { containerFit, jumpToCamera } from './fit';
import { setContextPaths, setContextVisible, setHighlight, setRoute, setStops, setTrail, installRouteLayers } from './layers/routeLayers';
import { installLod, type LodState } from './lod';
import { preload, type Prefetch, type PreloadTarget } from './preload';
import type { TripPlayer } from './types';

/** id of the 3D overlay layer; route lines go below it */
export const OVERLAY_LAYER = 'three';

/** plays a trip on a map it does not own: route layers, the 3D overlay layer, camera, tile streaming */
export class MapPlayer implements TripPlayer, PreloadTarget {
  tl?: Timeline;
  frame?: Frame;
  stops: Stop[] = [];
  time = 0;
  run = 0;
  onFrame?: (t: number) => void;
  onBuffering?: (waiting: boolean) => void;
  /** a frame takes over the map (false) or editing resumes (true) */
  onEditing?: (editing: boolean) => void;
  prefetch?: Prefetch<Timeline>;
  readonly lod: LodState = { detail: 0 };
  readonly fit: FitFn;
  /** the overlay layer's draw call; replaceable so the legacy facade can route it through its own method */
  draw = (gl: WebGL2RenderingContext, proj: ProjectionData) => this.overlay.render(gl, proj, this.overlayContext());
  private visited = -1;
  private raf = 0;
  private waiting = false;
  private selected: number | null = null;
  private context: LngLat[][] = [];
  private contextShown = true;

  /** stableTiles: each place keeps one tile level for the whole timeline (export) */
  constructor(readonly map: MlMap, private overlay: MapOverlay3D, opts: { stableTiles?: boolean } = {}) {
    this.fit = containerFit(map);
    this.lod.stable = opts.stableTiles;
    map.on('style.load', () => this.install());
    // the tile set depends on the viewport
    map.on('resize', () => { this.prefetch = undefined; });
  }

  private install() {
    installRouteLayers(this.map);
    this.map.addLayer(this.overlayLayer());
    installLod(this.map, this.lod);
    this.prefetch = undefined;
    this.visited = -1;
    this.contextShown = true;
    this.refreshStatic();
    this.setContext(this.context);
    if (this.tl && this.frame) this.setFrame(this.time);
  }

  private overlayLayer(): CustomLayerInterface {
    return {
      id: OVERLAY_LAYER, type: 'custom', renderingMode: '3d',
      // style reloads re-add the layer on the same canvas/context
      onAdd: (map, gl) => this.overlay.attach(map.getCanvas(), gl as WebGL2RenderingContext),
      render: (gl, args) => this.draw(gl as WebGL2RenderingContext, args.defaultProjectionData),
    };
  }

  private overlayContext(): OverlayContext {
    const c = this.map.getCenter();
    return {
      frame: this.frame, time: this.time, zoom: this.map.getZoom(), center: [c.lng, c.lat], pixelRatio: this.map.getPixelRatio(),
      selected: this.selected, elevation: (p) => this.map.queryTerrainElevation(p) ?? 0,
    };
  }

  /** Requires legs with computed paths. */
  async setTrip(stops: Stop[], legs: LegInput[], speed: number) {
    this.stops = stops;
    this.tl = legs.length ? buildTimeline(stops, legs, speed, this.fit) : undefined;
    await this.overlay.setLegs(this.tl?.legs ?? []);
    this.visited = -1;
    this.refreshStatic();
  }

  clear() {
    this.stop();
    if (this.frame) this.onEditing?.(true);
    this.frame = undefined;
    this.lod.detail = 0;
    this.setContext([]);
    void this.setTrip([], [], 1);
  }

  private refreshStatic() {
    const map = this.map;
    if (!map.getSource('route')) return;
    const legs = this.tl?.legs ?? [];
    setRoute(map, legs);
    this.showContext(!this.frame);
    setHighlight(map, !this.frame && this.selected !== null ? legs[this.selected] : undefined);
    setStops(map, this.stops, this.frame ? this.visited : this.stops.length);
    if (!this.frame) setTrail(map, legs, undefined);
  }

  setFrame(t: number | null) {
    const tl = this.tl;
    const editing = t === null || !tl;
    // before the camera jump: padding must already be zero
    if (editing === !!this.frame) this.onEditing?.(editing);
    if (editing) {
      this.frame = undefined;
      this.lod.detail = 0;
      this.refreshStatic();
      this.map.triggerRepaint();
      return;
    }
    this.time = Math.max(0, Math.min(t, tl.duration));
    const f = (this.frame = sample(tl, this.time));
    this.lod.detail = detailZoom(tl, this.time);
    this.showContext(false);
    setTrail(this.map, tl.legs, f);
    const visited = f.legIndex + (f.progress >= 1 ? 2 : 1);
    if (visited !== this.visited) { this.visited = visited; setStops(this.map, this.stops, visited); }
    jumpToCamera(this.map, f.camera);
    this.map.triggerRepaint();
    this.onFrame?.(this.time);
  }

  currentFrame() { return this.frame; }

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

  stop() { cancelAnimationFrame(this.raf); this.raf = 0; this.run++; }
  get playing() { return this.raf !== 0; }
  get duration() { return this.tl?.duration ?? 0; }
  get paths() { return this.tl?.legs.map((l) => l.path) ?? []; }
  get ready() { return !!this.tl && this.buffered >= this.tl.duration; }
  get buffered() { return this.tl && this.prefetch?.tl === this.tl ? this.prefetch.buffered : -1; }

  preload(onProgress: (p: number) => void, signal?: AbortSignal, ahead?: number, from?: number) {
    return preload(this, onProgress, signal, ahead, from);
  }

  setContext(paths: LngLat[][]) {
    this.context = paths;
    setContextPaths(this.map, paths);
  }

  // the video never shows the rest of the route, so the preview must not either
  private showContext(on: boolean) {
    if (on === this.contextShown || !this.map.getLayer('context')) return;
    this.contextShown = on;
    setContextVisible(this.map, on);
  }

  select(index: number | null) {
    this.selected = index;
    this.refreshStatic();
    this.map.triggerRepaint();
  }
}
