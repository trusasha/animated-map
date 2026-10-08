import { legMeta, segColor } from '../../../domain/legs';
import { legsOf } from '../../../domain/route';
import { span } from '../../../domain/trips';
import type { LngLat, TripData, UserSettings } from '../../../domain/types';
import type { EditorRouteView } from '../../../services/map';

export interface EditorViewArgs {
  data: TripData;
  settings: UserSettings;
  selected: number | null;
  pickingId: string | null;
  titleOf: (name: string) => string;
}

/** what the map draws while editing: colours, range dimming, pending legs and numbered markers */
export function editorView({ data, settings, selected, pickingId, titleOf }: EditorViewArgs): EditorRouteView {
  const [s0, s1] = span(data), last = data.stops.length - 1;
  const segments = data.stops.length > 1
    ? legsOf(data).map((leg, i) => ({
      mode: leg.mode, path: leg.path ?? [], color: segColor(leg, settings), inRange: i >= s0 && i < s1, pending: legMeta(data, i).building,
    }))
    : [];
  const stops = data.stops.map((s, k) => {
    const endOfSelected = selected !== null && (k === selected || k === selected + 1);
    const draggable = selected !== null && k === selected + 1;
    return {
      lngLat: [s.lng, s.lat] as LngLat,
      label: String(k + 1),
      title: draggable ? titleOf(s.name) : s.name,
      end: k === 0 || k === last,
      approx: !!s.approx,
      active: endOfSelected || s.id === pickingId,
      inRange: k >= s0 && k <= s1,
      draggable,
    };
  });
  return { segments, stops, selected };
}

/** the video stretch, or the selected leg with its two stops */
export function fitPoints(data: TripData, leg: number | null): LngLat[] {
  const [a, b] = leg === null ? span(data) : [leg, leg + 1];
  const paths = data.stops.length > 1 ? legsOf(data).slice(a, b).flatMap((l) => l.path ?? []) : [];
  return [...paths, ...data.stops.slice(a, b + 1).map((s): LngLat => [s.lng, s.lat])];
}
