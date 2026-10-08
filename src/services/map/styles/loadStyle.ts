import type { HillshadeLayerSpecification, RasterDEMSourceSpecification, StyleSpecification } from 'maplibre-gl';
import type { MapStyle } from '../../../domain/types';
import { registerDemProtocol } from './dem';
import { DEM, ESRI_HOSTS, GLYPHS } from './hosts';
import { UKIYOE_HILLSHADE, ukiyoeStyle } from './ukiyoe';

const EXAGGERATION = 1.5;

const SKY = {
  'sky-color': '#0b1636', 'horizon-color': '#9cc9ff', 'fog-color': '#d6e8ff',
  'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.85,
  'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 8, 0],
} as const;

export async function loadStyle(style: MapStyle): Promise<StyleSpecification> {
  registerDemProtocol();
  const base: StyleSpecification = style === 'satellite'
    ? {
      version: 8, glyphs: GLYPHS,
      sources: {
        sat: { type: 'raster', tiles: ESRI_HOSTS.map((h) => `${h}/World_Imagery/MapServer/tile/{z}/{y}/{x}`), tileSize: 256, maxzoom: 19, attribution: 'Esri, Maxar, Earthstar Geographics' },
        ref: { type: 'raster', tiles: ESRI_HOSTS.map((h) => `${h}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`), tileSize: 256, maxzoom: 19 },
      },
      layers: [{ id: 'sat', type: 'raster', source: 'sat' }, { id: 'ref', type: 'raster', source: 'ref', paint: { 'raster-opacity': 0.85 } }],
    }
    : style === 'ukiyoe' ? ukiyoeStyle(GLYPHS)
    : await (await fetch(`https://tiles.openfreemap.org/styles/${style === 'dark' ? 'dark' : 'liberty'}`)).json();
  for (const l of base.layers) if (l.type === 'raster') l.paint = { ...l.paint, 'raster-fade-duration': 0 };
  const dem = (attribution?: string): RasterDEMSourceSpecification => ({ type: 'raster-dem', tiles: DEM, encoding: 'terrarium', tileSize: 256, maxzoom: 12, ...(attribution && { attribution }) });
  const hillshade: HillshadeLayerSpecification = { id: 'hillshade', type: 'hillshade', source: 'hill', paint: style === 'ukiyoe' ? UKIYOE_HILLSHADE : { 'hillshade-exaggeration': style === 'satellite' ? 0.25 : 0.45, 'hillshade-shadow-color': '#1c2230' } };
  // over land/water fills (opaque, would hide it), under roads, buildings and labels
  const at = style === 'satellite' ? 1 : base.layers.findIndex((l) => l.type === 'symbol' || /building|aeroway|road|highway|tunnel|bridge|transportation/.test(l.id));
  const layers = [...base.layers];
  layers.splice(at < 0 ? layers.length : at, 0, hillshade);
  return {
    // hillshade on the terrain source makes MapLibre warn and render it coarser
    ...base, layers, sources: { ...base.sources, dem: dem('Terrain: Mapzen, AWS'), hill: dem() },
    terrain: { source: 'dem', exaggeration: EXAGGERATION },
    projection: { type: 'globe' }, sky: SKY as unknown as StyleSpecification['sky'],
  };
}
