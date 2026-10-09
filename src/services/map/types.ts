import type { LngLat, MapStyle, Mode, Stop } from '../../domain/types';
import type { Frame, LegInput } from '../../domain/timeline';

export type Padding = { top: number; bottom: number; left: number; right: number };

/** where the right-hand map controls sit, px from the container edges; `top` pins them to the top-right corner instead */
export type ControlsInset = { bottom: number; right: number; top?: number };

export type MapMode = 'home' | 'editor';

/** one leg as the editor draws it; colour, range and building state are the caller's decision */
export interface EditorSegment { mode: Mode; path: LngLat[]; color: string; inRange: boolean; pending: boolean }

/** a numbered stop marker */
export interface EditorStop {
  lngLat: LngLat;
  label: string;
  title: string;
  /** first or last stop, drawn filled */
  end: boolean;
  approx: boolean;
  /** endpoint of the selected segment, or the stop being placed */
  active: boolean;
  inRange: boolean;
  draggable: boolean;
}

export interface EditorRouteView { segments: EditorSegment[]; stops: EditorStop[]; selected: number | null }

/** a saved trip on the Home globe; fewer than 2 points are not drawn */
export interface HomeTrip { id: string; points: LngLat[] }

/** padding given here becomes the map's padding */
export interface CameraView { center: LngLat; zoom: number; bearing?: number; pitch?: number; padding?: Padding }

export interface FitOptions {
  maxZoom: number;
  duration: number;
  /** zoom when there is a single point; defaults to maxZoom */
  singleZoom?: number;
  curve?: number;
}

/** what tests read through `window.__ta` */
export interface MapProbe {
  padding: Padding;
  /** layout visibility of the player, editor and home layers */
  visible: Record<string, boolean>;
  /** feature count of each GeoJSON source */
  features: Record<string, number>;
  /** `color` property of each GeoJSON source's features */
  colors: Record<string, string[]>;
  /** stop markers currently shown */
  markers: number;
  center: LngLat;
  zoom: number;
}

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

  /** home: clears the trip and the editor route, shows saved trips; editor: shows the route being edited */
  setMode(m: MapMode): void;
  setEditorRoute(view: EditorRouteView): void;
  onSegmentClick(cb: (i: number) => void): () => void;
  /** a click in editing mode that hit no segment */
  onEmptyClick(cb: () => void): () => void;
  onStopDrag(cb: (i: number, p: LngLat) => void): () => void;
  /** crosshair until the next map click, which goes to onPick instead of the click handlers; returns cancel */
  startPick(onPick: (p: LngLat) => void): () => void;
  setHomeTrips(trips: HomeTrip[]): void;
  highlightTrip(id: string | null): void;
  /** the Home globe turns slowly while nothing else moves it */
  setSpin(on: boolean): void;

  /** UI padding for editing; playback always runs with zero padding */
  setPadding(p: Padding): void;
  resetPadding(): void;
  getPadding(): Padding;
  /** resolve when the camera stops; no-ops during playback */
  fitTo(points: LngLat[], o: FitOptions): Promise<void>;
  flyTo(v: CameraView, o: { duration: number; curve?: number }): Promise<void>;
  jumpTo(v: CameraView): void;
  /** zooms so the globe's radius is about `px` on screen */
  setGlobeRadius(px: number): void;
  setControlsInset(inset: ControlsInset): void;
  probe(): Promise<MapProbe>;
}

export interface OffscreenMap {
  player: TripPlayer;
  /** resolves when the map has rendered everything it needs, or after `ms` */
  idle(ms?: number): Promise<void>;
  canvas(): HTMLCanvasElement;
  destroy(): void;
}
