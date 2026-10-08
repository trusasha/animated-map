export type Mode = 'air' | 'ground' | 'water';

export type LngLat = [number, number];

/** approx: no geocoder confirmed the place, coordinates are the AI's guess; leg: how the traveller got here from the previous stop (every stop but the first has one) */
export interface Stop { id: string; name: string; lng: number; lat: number; approx?: boolean; /** region, country */ sub?: string; leg?: Leg }

export interface Leg {
  mode: Mode;
  /** built-in figure id or `model:<glb url>` */
  figure: string;
  /** cached route geometry, valid while pathKey matches `${prev.id}>${this stop.id}:${mode}` */
  path?: LngLat[];
  pathKey?: string;
  /** per-leg tempo multiplier, 1 = default */
  speed?: number;
  /** ground/water path smoothing multiplier, 0 = exact road, 1 = default */
  smooth?: number;
  /** line colour override, `#rrggbb`; missing = the default for the mode */
  color?: string;
}

export type Format = '9:16' | '4:5' | '1:1' | '16:9';
export type MapStyle = 'satellite' | 'streets' | 'dark' | 'ukiyoe';

export interface TripData {
  stops: Stop[];
  style: MapStyle;
  speed: number;
  format: Format;
  /** video captions; missing = all on */
  overlay?: Overlay;
  /** video covers only stops from..to (ids, one unbroken stretch); missing = whole route */
  range?: { from: string; to: string };
}

export interface Overlay { title: boolean; label: boolean; progress: boolean }

export interface Trip { id: string; title: string; data: TripData; updated_at?: string }

/** degrees (multiples of 90) applied after auto-orientation; scale multiplies the figure size */
export interface ModelPose { rx: number; ry: number; rz: number; scale: number }
/** mode null = offered for every mode */
export interface CustomModel { id: string; name: string; url: string | null; status: string; task_id: string | null; mode: Mode | null; pose: ModelPose | null }

export interface ParsedTrip {
  title: string;
  stops: { name: string; lng: number; lat: number; approx?: boolean; leg?: Leg }[];
}

export type Lang = 'ru' | 'en';
export type Theme = 'light' | 'dark' | 'system';
export type ExportLongSide = 1080 | 1920;

/** global, shared by all trips */
export interface UserSettings {
  theme: Theme;
  lang: Lang;
  /** default figure id per mode, used by new segments */
  figures: Record<Mode, string>;
  /** default line colour per mode */
  colors: Record<Mode, string>;
  /** stops farther apart than this start as air segments */
  flyKm: number;
  exportLongSide: ExportLongSide;
}

/** what the Home list needs of a trip */
export interface TripSummary { stops: number; modes: Mode[] }

export interface Place { name: string; label: string; lng: number; lat: number }
