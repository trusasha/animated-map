import { defaultFigure, figureFits } from './figures';
import { greatCircle } from './geo';
import { pathKey } from './route';
import { DEFAULT_SETTINGS } from './settings';
import type { CustomModel, Leg, Mode, TripData, UserSettings } from './types';

export const LINE_PALETTE = [
  { id: 'charcoal', color: '#31302e' }, { id: 'blue', color: '#0075de' }, { id: 'teal', color: '#2a9d99' }, { id: 'green', color: '#1aae39' },
  { id: 'orange', color: '#dd5b00' }, { id: 'pink', color: '#ff64c8' }, { id: 'purple', color: '#391c57' }, { id: 'brown', color: '#523410' },
] as const;

/** the segment's own colour, else the default of its mode */
export const segColor = (leg: Leg, settings: UserSettings = DEFAULT_SETTINGS) => leg.color ?? settings.colors[leg.mode];

const mapLegs = (d: TripData, fn: (l: Leg, i: number) => Leg): TripData =>
  ({ ...d, stops: d.stops.map((s, k) => { const leg = k > 0 && s.leg ? fn(s.leg, k - 1) : s.leg; return leg === s.leg ? s : { ...s, leg }; }) });

export const applyColorToAll = (d: TripData, color: string): TripData => mapLegs(d, (l) => ({ ...l, color }));

/** back to the default of the mode: the key is removed, not set to undefined */
export const resetColor = (d: TripData, i: number): TripData =>
  mapLegs(d, (l, k) => { if (k !== i) return l; const { color: _drop, ...rest } = l; return rest; });

/** the figure stays when it also suits the new mode, else the mode's default figure takes over */
export function changeMode(leg: Leg, mode: Mode, models: CustomModel[], settings: UserSettings = DEFAULT_SETTINGS): Leg {
  if (leg.mode === mode) return leg;
  return { ...leg, mode, figure: figureFits(leg.figure, mode, models) ? leg.figure : defaultFigure(mode, models, settings) };
}

export interface LegMeta {
  /** the cached path is missing or belongs to other stops or another mode */
  building: boolean;
  /** a road leg whose path is just the great circle: no road was found */
  straight: boolean;
  /** pace shown as ×N, null when it is the default */
  pace: number | null;
}

export function legMeta(d: TripData, i: number): LegMeta {
  const leg = d.stops[i + 1].leg!;
  const building = !leg.path || leg.pathKey !== pathKey(d, i);
  let straight = false;
  if (!building && leg.mode === 'ground') {
    const a = d.stops[i], b = d.stops[i + 1], line = greatCircle([a.lng, a.lat], [b.lng, b.lat]);
    straight = leg.path!.length === line.length && leg.path!.every((p, k) => p[0] === line[k][0] && p[1] === line[k][1]);
  }
  return { building, straight, pace: (leg.speed ?? 1) === 1 ? null : leg.speed! };
}
