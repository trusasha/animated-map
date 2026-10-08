// Legacy facade for App.tsx/exporter.ts until the cutover: the old Animator API over services/map + scene3d.
import type * as maplibregl from 'maplibre-gl';
import type { ProjectionData } from '../domain/overlay3d';
import type { LegInput, Timeline } from '../domain/timeline';
import type { LngLat, Stop } from '../domain/types';
import { MapPlayer } from '../services/map/player';
import { planTiles } from '../services/map/preload';
import { registerDemProtocol } from '../services/map/styles/dem';
import { installImageResolver } from '../services/map/styles/imageResolver';
import { createOverlay3D } from '../services/scene3d/overlay/createOverlay3D';

export { idle } from '../services/map/createOffscreenMap';
export { TILE_CACHE_ZOOM_LEVELS } from '../services/map/styles/hosts';
export { loadStyle } from '../services/map/styles/loadStyle';

export class Animator {
  private player: MapPlayer;
  private draw: MapPlayer['draw'];

  /** legacy only: wraps a map the caller created */
  constructor(public map: maplibregl.Map) {
    registerDemProtocol();
    installImageResolver(map);
    this.player = new MapPlayer(map, createOverlay3D());
    this.draw = this.player.draw;
    // looked up per call so e2e/baselines/overlay.ts can wrap it to read the layer's matrices
    this.player.draw = (gl, data) => this.renderThree(gl, data);
  }

  get tl() { return this.player.tl; }
  get frame() { return this.player.frame; }
  get stops() { return this.player.stops; }
  get time() { return this.player.time; }
  get ready() { return this.player.ready; }
  get buffered() { return this.player.buffered; }
  get playing() { return this.player.playing; }
  get fit() { return this.player.fit; }
  get onFrame() { return this.player.onFrame; }
  set onFrame(cb) { this.player.onFrame = cb; }
  get onBuffering() { return this.player.onBuffering; }
  set onBuffering(cb) { this.player.onBuffering = cb; }

  setTrip(stops: Stop[], legs: LegInput[], speed: number) { return this.player.setTrip(stops, legs, speed); }
  setContext(paths: LngLat[][]) { this.player.setContext(paths); }
  setFrame(t: number | null) { this.player.setFrame(t); }
  select(index: number | null) { this.player.select(index); }
  play(from?: number) { this.player.play(from); }
  stop() { this.player.stop(); }
  preload(onProgress: (p: number) => void, signal?: AbortSignal, ahead?: number, from?: number) { return this.player.preload(onProgress, signal, ahead, from); }

  /** called by e2e/baselines/capture.ts */
  plannedTiles(tl: Timeline, alive: () => boolean, onProgress: (p: number) => void) {
    return planTiles(this.map, this.player.lod, tl, alive, onProgress);
  }

  private renderThree(gl: WebGL2RenderingContext, data: ProjectionData) { this.draw(gl, data); }
}
