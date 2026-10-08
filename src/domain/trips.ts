import { chain } from './route';
import { DEFAULT_SETTINGS } from './settings';
import type { LngLat, Mode, Stop, TripData, TripSummary, UserSettings } from './types';

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

/** places swap, legs keep their positions: otherwise a swap with the first stop throws its leg away */
export function moveStop(d: TripData, i: number, dir: -1 | 1, settings: UserSettings = DEFAULT_SETTINGS): TripData {
  const j = Math.min(i, i + dir);
  if (j < 0 || j + 1 >= d.stops.length) return d;
  const stops = d.stops.map((s, k) => (k === j ? { ...d.stops[j + 1], leg: s.leg } : k === j + 1 ? { ...d.stops[j], leg: s.leg } : s));
  return chain({ ...d, stops }, settings);
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
