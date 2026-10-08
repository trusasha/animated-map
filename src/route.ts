import { distance } from './geo';
import { FIGURES, type Leg, type LngLat, type Trip, type TripData } from './types';

export const defaultLeg = (a: LngLat, b: LngLat): Leg =>
  distance(a, b) > 600_000 ? { mode: 'air', figure: 'airplane' } : { mode: 'ground', figure: 'car' };
/** legs[i] goes stops[i] → stops[i + 1]; it is stored on stops[i + 1] */
export const legsOf = (d: TripData) => d.stops.slice(1).map((s) => s.leg!);
export const pathKey = (d: TripData, i: number) => `${d.stops[i].id}>${d.stops[i + 1].id}:${d.stops[i + 1].leg!.mode}`;
export const setLegAt = (d: TripData, i: number, fn: (l: Leg) => Leg): TripData =>
  ({ ...d, stops: d.stops.map((s, k) => (k === i + 1 ? { ...s, leg: fn(s.leg!) } : s)) });

const validLeg = (l: Leg | null | undefined): l is Leg => !!l && Object.hasOwn(FIGURES, l.mode) && typeof l.figure === 'string';

/** the route is one unbroken chain: the first stop has no leg, every other stop has a valid one; ids are unique; range points at stops in order */
export function chain(d: TripData): TripData {
  const seen = new Set<string>();
  const stops = (d.stops ?? []).map((s, i, all) => {
    if (seen.has(s.id)) s = { ...s, id: crypto.randomUUID() };
    seen.add(s.id);
    if (i === 0) return s.leg !== undefined ? { ...s, leg: undefined } : s;
    const p = all[i - 1];
    return validLeg(s.leg) ? s : { ...s, leg: defaultLeg([p.lng, p.lat], [s.lng, s.lat]) };
  });
  const a = stops.findIndex((s) => s.id === d.range?.from), b = stops.findIndex((s) => s.id === d.range?.to);
  const range = d.range && a >= 0 && b > a ? d.range : undefined;
  return range === d.range && d.stops && stops.every((s, i) => s === d.stops[i]) ? d : { ...d, stops, range };
}

/** also folds in trips saved before legs moved onto stops (top-level legs[]) */
export function migrate(t: Trip): Trip {
  const { legs, ...data } = t.data as TripData & { legs?: (Leg | null)[] | null };
  const stops = legs ? (data.stops ?? []).map((s, i) => (i > 0 && legs[i - 1] ? { ...s, leg: legs[i - 1]! } : s)) : data.stops;
  return { ...t, data: chain({ ...data, stops }) };
}
