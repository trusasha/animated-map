import type { ExpressionSpecification, GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import type { HomeTrip } from '../types';

export const HOME_TRIPS_SOURCE = 'home-trips';
const POINTS_SOURCE = 'home-trip-pts';
export const HOME_LAYERS = ['home-trips', 'home-trip-pts'];

const LINE = '#31302e';
const HIGHLIGHT = '#0075de';
const hl = (on: unknown, off: unknown) => ['case', ['get', 'hl'], on, off] as ExpressionSpecification;

/** saved trips on the Home globe; `before` keeps them under the 3D overlay */
export function installTripsLayer(map: MlMap, before?: string) {
  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
  map.addSource(HOME_TRIPS_SOURCE, { type: 'geojson', data: empty });
  map.addSource(POINTS_SOURCE, { type: 'geojson', data: empty });
  map.addLayer({
    id: 'home-trips', type: 'line', source: HOME_TRIPS_SOURCE, layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': hl(HIGHLIGHT, LINE), 'line-width': hl(3.5, 2), 'line-opacity': 0.9 },
  }, before);
  map.addLayer({
    id: 'home-trip-pts', type: 'circle', source: POINTS_SOURCE,
    paint: { 'circle-radius': hl(4.5, 3), 'circle-color': '#ffffff', 'circle-stroke-width': 2, 'circle-stroke-color': hl(HIGHLIGHT, LINE) },
  }, before);
}

export function setTrips(map: MlMap, trips: HomeTrip[], highlighted: string | null) {
  const drawn = trips.filter((t) => t.points.length >= 2);
  const lines: GeoJSON.Feature[] = drawn.map((t) => ({
    type: 'Feature', properties: { hl: t.id === highlighted }, geometry: { type: 'LineString', coordinates: t.points },
  }));
  const points: GeoJSON.Feature[] = drawn.flatMap((t) => t.points.map((p) => ({
    type: 'Feature', properties: { hl: t.id === highlighted }, geometry: { type: 'Point', coordinates: p },
  })));
  (map.getSource(HOME_TRIPS_SOURCE) as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: lines });
  (map.getSource(POINTS_SOURCE) as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: points });
}
