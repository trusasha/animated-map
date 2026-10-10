import { chain, migrate } from './route';
import { DEFAULT_SETTINGS } from './settings';
import { ASPECTS } from './video';
import type { Format, LngLat, MapStyle, Mode, Stop, Trip, TripData, TripSummary, UserSettings } from './types';

/** stop indices [first, last] the video covers: the chosen stretch, or the whole route */
export function span(d: TripData): [number, number] {
  const a = d.stops.findIndex((s) => s.id === d.range?.from), b = d.stops.findIndex((s) => s.id === d.range?.to);
  return a >= 0 && b > a ? [a, b] : [0, Math.max(d.stops.length - 1, 0)];
}

/** modes in order of first use */
export const tripSummary = (d: TripData): TripSummary =>
  ({ stops: d.stops.length, modes: [...new Set(d.stops.slice(1).map((s) => s.leg?.mode).filter((m): m is Mode => !!m))] });

/** what the Home globe draws: stop coordinates, never paths */
export const homePoints = (d: TripData): LngLat[] => d.stops.map((s) => [s.lng, s.lat]);

export type TimeBucket =
  | { unit: 'now' } | { unit: 'minutes' | 'hours'; n: number } | { unit: 'yesterday' } | { unit: 'date'; date: Date };

export function relativeTimeBucket(updatedAt: string | Date, now: number = Date.now()): TimeBucket {
  const at = new Date(updatedAt), ms = now - at.getTime();
  if (!(ms >= 60_000)) return { unit: 'now' };
  if (ms < 3_600_000) return { unit: 'minutes', n: Math.floor(ms / 60_000) };
  if (ms < 86_400_000) return { unit: 'hours', n: Math.floor(ms / 3_600_000) };
  return ms < 172_800_000 ? { unit: 'yesterday' } : { unit: 'date', date: at };
}

const DEFAULT_NAMES = new Set(['моё путешествие', 'новое путешествие', 'my trip', 'new trip', 'untitled']);
/** names the app gives itself: safe to replace with a suggestion */
export const isDefaultTripName = (name: string) => DEFAULT_NAMES.has(name.trim().toLowerCase()) || name.trim() === '';

export const suggestTripName = (stops: Pick<Stop, 'name'>[]) => (stops.length < 2 ? '' : `${stops[0].name} → ${stops.at(-1)!.name}`);

/** with under 3 stops a sub-range would be the whole route */
const fixRange = (d: TripData): TripData => (d.stops.length < 3 && d.range ? { ...d, range: undefined } : d);

/** removes the stop with its incoming leg; the neighbours re-join */
export const removeStop = (d: TripData, i: number, settings: UserSettings = DEFAULT_SETTINGS): TripData =>
  fixRange(chain({ ...d, stops: d.stops.filter((_, k) => k !== i) }, settings));

/** places reorder, legs keep their positions: the same as repeated swaps with a neighbour, so a move to the top doesn't throw a leg away */
export function moveStop(d: TripData, from: number, to: number, settings: UserSettings = DEFAULT_SETTINGS): TripData {
  const n = d.stops.length;
  if (from === to || Math.min(from, to) < 0 || Math.max(from, to) >= n) return d;
  const places = d.stops.slice();
  places.splice(to, 0, ...places.splice(from, 1));
  return chain({ ...d, stops: places.map((s, k) => (s === d.stops[k] ? s : { ...s, leg: d.stops[k].leg })) }, settings);
}

/** moving a stop re-routes both legs that touch it: they share it as finish and start */
export function moveStopTo(d: TripData, i: number, [lng, lat]: LngLat): TripData {
  const stale = (s: Stop) => (s.leg ? { ...s, leg: { ...s.leg, pathKey: undefined } } : s);
  return {
    ...d,
    stops: d.stops.map((s, k) => {
      if (k !== i) return k === i + 1 ? stale(s) : s;
      const moved: Stop = { ...s, lng, lat, approx: undefined };
      delete moved.sub;
      return stale(moved);
    }),
  };
}

/** true when an edit dropped the video range (for the "range reset" toast) */
export const rangeWasReset = (before: TripData, after: TripData) => !!before.range && !after.range;

const STYLES: MapStyle[] = ['satellite', 'streets', 'dark', 'ukiyoe'];

/** a stored trip of any age becomes one the UI can open: missing style, speed, format and overlay get defaults */
export function normalizeTrip(t: Trip, settings: UserSettings = DEFAULT_SETTINGS): Trip {
  const m = migrate(t, settings), d = m.data;
  const data: TripData = {
    ...d,
    style: STYLES.includes(d.style) ? d.style : 'satellite',
    speed: typeof d.speed === 'number' && d.speed > 0 ? d.speed : 1,
    format: Object.hasOwn(ASPECTS, d.format) ? d.format : ('9:16' satisfies Format),
    overlay: { title: d.overlay?.title ?? true, label: d.overlay?.label ?? true, progress: d.overlay?.progress ?? true },
  };
  return { ...m, data };
}
