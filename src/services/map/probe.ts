import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { HOME_LAYERS } from './home/tripsLayer';
import { EDITOR_LAYERS } from './layers/editorLayers';
import { PLAYER_LAYERS } from './layers/routeLayers';
import type { MapProbe, Padding } from './types';

/** layer visibility and source contents for tests, without handing out the MapLibre instance */
export async function probe(map: MlMap, padding: Padding, markers: number): Promise<MapProbe> {
  const ids = [...PLAYER_LAYERS, ...EDITOR_LAYERS, ...HOME_LAYERS].filter((id) => map.getLayer(id));
  const visible = Object.fromEntries(ids.map((id) => [id, map.getLayoutProperty(id, 'visibility') !== 'none']));
  const features: Record<string, number> = {};
  const colors: Record<string, string[]> = {};
  for (const [id, spec] of Object.entries(map.getStyle().sources)) {
    if (spec.type !== 'geojson') continue;
    const data = await (map.getSource(id) as GeoJSONSource).getData();
    features[id] = data.type === 'FeatureCollection' ? data.features.length : 1;
    if (data.type === 'FeatureCollection') colors[id] = data.features.flatMap((f) => f.properties?.color ?? []);
  }
  const { lng, lat } = map.getCenter();
  return { padding, visible, features, colors, markers, center: [lng, lat], zoom: map.getZoom() };
}
