import type { ExpressionSpecification, GeoJSONSource, LineLayerSpecification, Map as MlMap } from 'maplibre-gl';
import type { Mode } from '../../../domain/types';
import type { EditorSegment } from '../types';
import { DASH, PENDING_DASH } from './dash';

export const EDITOR_SOURCE = 'editor-route';
const MODES: Mode[] = ['ground', 'water', 'air'];
export const EDITOR_LAYERS = ['seg-casing', ...MODES.map((m) => `seg-${m}`), 'seg-pending'];

const OPACITY = { in: 0.92, out: 0.25, pending: 0.5 };
const WIDTH = { normal: 3.5, selected: 5.5, casing: 12 };

const round = { 'line-cap': 'round', 'line-join': 'round' } as const;
const selected: ExpressionSpecification = ['==', ['get', 'sel'], true];

/** the editor's route lines; `before` keeps them under the 3D overlay */
export function installEditorLayers(map: MlMap, before?: string) {
  map.addSource(EDITOR_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  const base: LineLayerSpecification['paint'] = {
    'line-color': ['get', 'color'],
    'line-width': ['case', selected, WIDTH.selected, WIDTH.normal],
    'line-opacity': ['get', 'op'],
  };
  const add = (id: string, filter: ExpressionSpecification, dash: [number, number] | null) =>
    map.addLayer({ id, type: 'line', source: EDITOR_SOURCE, filter, layout: round, paint: dash ? { ...base, 'line-dasharray': dash } : base }, before);
  map.addLayer({
    id: 'seg-casing', type: 'line', source: EDITOR_SOURCE, filter: selected, layout: round,
    paint: { 'line-color': '#ffffff', 'line-width': WIDTH.casing, 'line-opacity': 0.95, 'line-blur': 0.5 },
  }, before);
  for (const m of MODES) add(`seg-${m}`, ['all', ['==', ['get', 'mode'], m], ['!', ['get', 'pend']]], DASH[m]);
  add('seg-pending', ['get', 'pend'], PENDING_DASH);
}

const opacity = (s: EditorSegment) => (!s.inRange ? OPACITY.out : s.pending ? OPACITY.pending : OPACITY.in);

export function setEditorSegments(map: MlMap, segments: EditorSegment[], sel: number | null) {
  const features: GeoJSON.Feature[] = segments.flatMap((s, i) => s.path.length < 2 ? [] : [{
    type: 'Feature',
    properties: { i, mode: s.mode, color: s.color, sel: sel === i, pend: s.pending, op: opacity(s) },
    geometry: { type: 'LineString', coordinates: s.path },
  }]);
  (map.getSource(EDITOR_SOURCE) as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features });
}
