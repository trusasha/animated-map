import type { Map as MlMap } from 'maplibre-gl';
import type { Frame, Timeline } from '../../../domain/timeline';
import type { LodState } from '../lod';
import { fetchTiles, type Prefetch } from './fetch';
import { planTiles } from './plan';

/** seconds of timeline that must be cached before playback starts; the rest streams in behind */
export const BUFFER_AHEAD = 10;

export { planTiles, type TilePlan } from './plan';
export type { Prefetch } from './fetch';

/** the player state preloading reads and resets */
export interface PreloadTarget {
  readonly map: MlMap; readonly lod: LodState;
  readonly tl?: Timeline; readonly frame?: Frame; readonly time: number; readonly buffered: number;
  /** bumped by stop(): a newer run cancels this one */
  readonly run: number;
  prefetch?: Prefetch<Timeline>;
  stop(): void;
  setFrame(t: number): void;
}

/**
 * Streams the route's tiles into the browser's HTTP cache like a video player buffers: plans the tile set once
 * per timeline, downloads it in timeline order in the background, and resolves as soon as [from, from+ahead]
 * is cached. Playback holds at `buffered` if it catches up. False if interrupted.
 */
export async function preload(p: PreloadTarget, onProgress: (p: number) => void, signal?: AbortSignal, ahead = BUFFER_AHEAD, from = 0) {
  const tl = p.tl;
  if (!tl) return true;
  p.stop();
  const run = p.run, map = p.map;
  const alive = () => run === p.run && !signal?.aborted && tl === p.tl;
  const plan = 0.3;
  if (p.prefetch?.tl !== tl) {
    const cam = { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
    const planned = await planTiles(map, p.lod, tl, alive, (x) => onProgress(x * plan));
    if (p.frame) p.setFrame(p.time);
    else map.jumpTo(cam);
    if (!planned || !alive()) return false;
    const pf: Prefetch<Timeline> = { tl, buffered: -1 };
    p.prefetch = pf;
    void fetchTiles(pf, tl.duration, planned, () => p.prefetch === pf && !signal?.aborted, signal);
  }
  const target = Math.min(tl.duration, from + ahead);
  while (p.buffered < target) {
    if (!alive()) return false;
    onProgress(plan + (1 - plan) * Math.max(0, (p.buffered - from) / (target - from || 1)));
    await new Promise((r) => setTimeout(r, 200));
  }
  return true;
}
