// "Японская гравюра": an ukiyo-e flavoured style over OpenFreeMap's OpenMapTiles vector data.
import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';

const PAPER = '#efe2c4', INK = '#2a211b', INDIGO = '#2c4a78', PINE = '#55704a', OCHRE = '#c9a66b', VERMILION = '#a3402c';
const FONT = ['Noto Sans Bold'];
const NAME: ExpressionSpecification = ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];
const byZoom = (...stops: number[]): ExpressionSpecification => ['interpolate', ['exponential', 1.5], ['zoom'], ...stops];

export const UKIYOE_HILLSHADE = {
  'hillshade-exaggeration': 0.3, 'hillshade-shadow-color': '#8a7457', 'hillshade-highlight-color': '#fffaf0', 'hillshade-accent-color': '#a08a68',
};

export function ukiyoeStyle(glyphs: string): StyleSpecification {
  return {
    version: 8, glyphs,
    sources: {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '© OpenStreetMap, OpenFreeMap' },
      // a 'background' layer isn't drawn onto the terrain mesh, a world-sized fill is
      world: { type: 'geojson', data: { type: 'Polygon', coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]] } },
    },
    layers: [
      { id: 'paper-base', type: 'background', paint: { 'background-color': PAPER } },
      { id: 'paper', type: 'fill', source: 'world', paint: { 'fill-pattern': 'washi' } },
      { id: 'grass', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'farmland', 'wetland']]], paint: { 'fill-color': OCHRE, 'fill-opacity': 0.25 } },
      { id: 'wood', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-color': PINE, 'fill-opacity': 0.45 } },
      { id: 'ice', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'ice'], paint: { 'fill-color': '#fbf6ea' } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': PINE, 'fill-opacity': 0.25 } },
      { id: 'town', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood']]], paint: { 'fill-color': '#d8bf93', 'fill-opacity': 0.5 } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': INDIGO } },
      { id: 'shore', type: 'line', source: 'omt', 'source-layer': 'water', paint: { 'line-color': INK, 'line-width': byZoom(4, 0.6, 12, 1.6), 'line-opacity': 0.8 } },
      { id: 'river', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 8, paint: { 'line-color': INDIGO, 'line-width': byZoom(8, 0.6, 14, 2.5) } },
      { id: 'border', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['<=', ['get', 'admin_level'], 4], paint: { 'line-color': INK, 'line-width': byZoom(3, 0.6, 10, 1.4), 'line-dasharray': [3, 2], 'line-opacity': 0.5 } },
      { id: 'road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11, filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary', 'minor']]], paint: { 'line-color': INK, 'line-width': byZoom(11, 0.4, 16, 2), 'line-opacity': 0.55 } },
      { id: 'road-major', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 6, filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]], layout: { 'line-join': 'round' }, paint: { 'line-color': VERMILION, 'line-width': byZoom(6, 0.5, 14, 3), 'line-opacity': 0.75 } },
      { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': '#d9c09a', 'fill-outline-color': INK } },
      {
        id: 'water-name', type: 'symbol', source: 'omt', 'source-layer': 'water_name',
        layout: { 'text-field': NAME, 'text-font': ['Noto Sans Italic'], 'text-size': 13, 'text-letter-spacing': 0.1 },
        paint: { 'text-color': '#f3ead2', 'text-halo-color': INDIGO, 'text-halo-width': 1.2 },
      },
      {
        id: 'place', type: 'symbol', source: 'omt', 'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['country', 'state', 'city', 'town', 'village']]],
        layout: {
          'text-field': NAME, 'text-font': FONT,
          'text-size': ['match', ['get', 'class'], 'country', 18, 'state', 13, 'city', 16, 'town', 13, 11],
          'text-transform': ['match', ['get', 'class'], ['country', 'state'], 'uppercase', 'none'],
          'text-letter-spacing': ['match', ['get', 'class'], ['country', 'state'], 0.2, 0.03],
        },
        paint: { 'text-color': INK, 'text-halo-color': PAPER, 'text-halo-width': 1.6 },
      },
    ],
  };
}

/** paper texture, drawn on demand when the style asks for it */
export function ukiyoePattern(id: string): ImageData | undefined {
  if (id === 'washi') {
    const size = 256, ctx = canvas(size, size);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, size, size);
    // ponytail: Math.random fibres, stable within a page; seed it if two exports must match pixel for pixel
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * size, y = Math.random() * size, a = Math.random() * Math.PI, len = 2 + Math.random() * 10;
      ctx.strokeStyle = `rgba(120, 90, 50, ${0.04 + Math.random() * 0.08})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (const dx of [0, size, -size]) for (const dy of [0, size, -size]) {
        ctx.moveTo(x + dx, y + dy);
        ctx.lineTo(x + dx + Math.cos(a) * len, y + dy + Math.sin(a) * len);
      }
      ctx.stroke();
    }
    return ctx.getImageData(0, 0, size, size);
  }
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c.getContext('2d')!;
}
