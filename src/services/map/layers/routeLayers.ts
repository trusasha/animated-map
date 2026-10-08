import type { ExpressionSpecification, GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { slicePath, type Frame, type TLeg } from '../../../domain/timeline';
import type { LngLat, Mode, Stop } from '../../../domain/types';

const MODE_COLOR: Record<Mode, string> = { air: '#ffffff', ground: '#ffb703', water: '#4cc9f0' };
const legColor = (l: TLeg) => l.color ?? MODE_COLOR[l.mode];
const HIGHLIGHT = '#ff4d6d';

type Features = GeoJSON.Feature[];
const line = (coordinates: number[][], properties: GeoJSON.GeoJsonProperties = {}): GeoJSON.Feature =>
  ({ type: 'Feature', properties, geometry: { type: 'LineString', coordinates } });
const source = (map: MlMap, id: string) => map.getSource(id) as GeoJSONSource | undefined;
const set = (map: MlMap, id: string, features: Features) => source(map, id)?.setData({ type: 'FeatureCollection', features });

/** what playback draws; the editor hides these while editing */
export const PLAYER_LAYERS = ['route', 'highlight-glow', 'highlight', 'trail-casing', 'trail', 'stops', 'stop-labels'];

/** player sources and layers; the 3D overlay goes on top of them */
export function installRouteLayers(map: MlMap) {
  const empty = { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection;
  for (const id of ['context', 'route', 'highlight', 'trail', 'stops']) map.addSource(id, { type: 'geojson', data: empty });
  const round = { 'line-cap': 'round', 'line-join': 'round' } as const;
  map.addLayer({ id: 'context', type: 'line', source: 'context', layout: round, paint: { 'line-color': '#c8d0dc', 'line-width': 2, 'line-opacity': 0.35, 'line-dasharray': [1, 2] } });
  const color: ExpressionSpecification = ['get', 'color'];
  map.addLayer({ id: 'route', type: 'line', source: 'route', layout: round, paint: { 'line-color': color, 'line-width': 2.5, 'line-opacity': 0.45, 'line-dasharray': [1.5, 1.5] } });
  map.addLayer({ id: 'highlight-glow', type: 'line', source: 'highlight', layout: round, paint: { 'line-color': '#ffffff', 'line-width': 16, 'line-opacity': 0.35, 'line-blur': 6 } });
  map.addLayer({ id: 'highlight', type: 'line', source: 'highlight', layout: round, paint: { 'line-color': HIGHLIGHT, 'line-width': 6 } });
  map.addLayer({ id: 'trail-casing', type: 'line', source: 'trail', layout: round, paint: { 'line-color': '#000', 'line-width': 8, 'line-opacity': 0.35, 'line-blur': 2 } });
  map.addLayer({ id: 'trail', type: 'line', source: 'trail', layout: round, paint: { 'line-color': color, 'line-width': 4.5 } });
  map.addLayer({ id: 'stops', type: 'circle', source: 'stops', paint: { 'circle-radius': 6, 'circle-color': ['case', ['get', 'visited'], '#ff4d6d', '#ffffff'], 'circle-stroke-color': '#0b0f17', 'circle-stroke-width': 2 } });
  map.addLayer({
    id: 'stop-labels', type: 'symbol', source: 'stops',
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 14, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-allow-overlap': true },
    paint: { 'text-color': '#ffffff', 'text-halo-color': '#0b0f17', 'text-halo-width': 1.6 },
  });
}

/** ground and water legs as planned (air legs are 3D arcs) */
export const setRoute = (map: MlMap, legs: TLeg[]) =>
  set(map, 'route', legs.filter((l) => l.mode !== 'air').map((l) => line(l.path, { color: legColor(l) })));

export const setHighlight = (map: MlMap, leg: TLeg | undefined) =>
  set(map, 'highlight', leg && leg.mode !== 'air' ? [line(leg.path)] : []);

export const setStops = (map: MlMap, stops: Stop[], visited: number) =>
  set(map, 'stops', stops.map((s, i) => ({ type: 'Feature', properties: { name: s.name, visited: i < visited }, geometry: { type: 'Point', coordinates: [s.lng, s.lat] } })));

export const setContextPaths = (map: MlMap, paths: LngLat[][]) => set(map, 'context', paths.map((p) => line(p)));

/** the travelled part of ground/water legs up to the frame; no frame clears it */
export function setTrail(map: MlMap, legs: TLeg[], f: Frame | undefined) {
  const features: Features = [];
  if (f) legs.forEach((leg, i) => {
    if (leg.mode === 'air' || i > f.legIndex) return;
    const coords = i < f.legIndex ? leg.path : slicePath(leg, f.progress).map(([x, y]) => [x, y]);
    if (coords.length > 1) features.push(line(coords, { color: legColor(leg) }));
  });
  set(map, 'trail', features);
}

export const setContextVisible = (map: MlMap, on: boolean) => map.setLayoutProperty('context', 'visibility', on ? 'visible' : 'none');
