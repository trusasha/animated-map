import type { LngLat, MapStyle, Stop } from '../../domain/types';
import type { Frame, LegInput } from '../../domain/timeline';

export type Padding = { top: number; bottom: number; left: number; right: number };

export interface TripPlayer {
  setTrip(stops: Stop[], legs: LegInput[], speed: number): Promise<void>;
  clear(): void;
  /** null = editing mode: no figure, whole route visible */
  setFrame(t: number | null): void;
  play(from?: number): void;
  stop(): void;
  /** streams the timeline's tiles into the HTTP cache; resolves once [from, from+ahead] is cached, false if interrupted */
  preload(onProgress: (p: number) => void, signal?: AbortSignal, ahead?: number, from?: number): Promise<boolean>;
  /** every tile of the timeline is cached */
  readonly ready: boolean;
  /** timeline seconds up to which every tile is cached */
  readonly buffered: number;
  readonly duration: number;
  readonly time: number;
  readonly playing: boolean;
  onFrame?: (t: number) => void;
  /** playback caught up with the tile download and is holding */
  onBuffering?: (waiting: boolean) => void;
  currentFrame(): Frame | undefined;
}

export interface MapService {
  player: TripPlayer;
  whenLoaded(): Promise<void>;
  setStyle(s: MapStyle): Promise<void>;
  /** rest of the route outside the video, drawn faint for orientation */
  setContext(paths: LngLat[][]): void;
  /** editing mode only: outlines one leg, null clears */
  select(i: number | null): void;
  fitBounds(points: LngLat[], o: { padding: Padding | number; maxZoom: number; duration: number }): void;
  onClick(cb: (p: LngLat) => void): () => void;
  setCursor(c: string): void;
  addDraggableMarker(p: LngLat, onDragEnd: (p: LngLat) => void): () => void;
  project(p: LngLat): [number, number];
  destroy(): void;
}

export interface OffscreenMap {
  player: TripPlayer;
  /** resolves when the map has rendered everything it needs, or after `ms` */
  idle(ms?: number): Promise<void>;
  canvas(): HTMLCanvasElement;
  destroy(): void;
}
