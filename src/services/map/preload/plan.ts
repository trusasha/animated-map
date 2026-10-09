import type { Map as MlMap } from 'maplibre-gl';
import { detailZoom, sample, type Timeline } from '../../../domain/timeline';
import { jumpToCamera } from '../fit';
import type { LodState } from '../lod';
import { addTile, createPins, type Pins } from '../stable/pins';
import { FINE, preloadTimes } from './times';

/** tile URLs in timeline order; cuts[k] = how many of them cover everything up to times[k] */
export interface TilePlan { times: number[]; cuts: number[]; urls: string[] }

// coveringTiles options and source fields beyond the public typing
type TileSource = { id: string; type: string; tiles: string[]; tileSize?: number; minzoom: number; maxzoom: number; scheme?: string; calculateTileZoom: unknown };
type TileID = { canonical: { z: number; x: number; y: number; url(tiles: string[], pixelRatio: number, scheme?: string): string } };
type Covering = (o: object) => TileID[];

/** every tile URL the camera will need over the whole timeline; moves the camera without rendering */
export async function planTiles(map: MlMap, lod: LodState, tl: Timeline, alive: () => boolean, onProgress: (p: number) => void): Promise<TilePlan | undefined> {
  const spec = map.getStyle().sources as Record<string, { tiles?: string[] }>;
  // a MapLibre 6 source object only carries `tiles` once loaded; the style spec always has them
  const sources = Object.keys(spec).flatMap((id): TileSource[] => {
    const src = map.getSource(id) as unknown as TileSource | undefined;
    const tiles = src?.tiles ?? spec[id].tiles;
    return src && tiles ? [{ id, type: src.type, tiles, tileSize: src.tileSize, minzoom: src.minzoom, maxzoom: src.maxzoom, scheme: src.scheme, calculateTileZoom: src.calculateTileZoom }] : [];
  });
  const times = preloadTimes(tl, FINE);
  const terrain = (map as unknown as { terrain: unknown }).terrain;
  const covering = map.coveringTiles.bind(map) as unknown as Covering;
  const detail = lod.detail;

  /** every planned camera's tiles per source; false if interrupted */
  const sweep = async (each: (s: TileSource, id: TileID) => void, afterFrame: () => void, from: number, span: number) => {
    for (const [i, t] of times.entries()) {
      jumpToCamera(map, sample(tl, t).camera);
      lod.detail = detailZoom(tl, t);
      for (const s of sources) {
        // raster rounds the zoom, vector floors it; DEM serves both hillshade and terrain, which differ, so take both
        for (const roundZoom of s.type === 'raster' ? [true] : s.type === 'vector' ? [false] : [false, true]) {
          // terrain and the source's own zoom function: the same tile choice the renderer makes
          for (const id of covering({ tileSize: s.tileSize ?? 512, minzoom: s.minzoom, maxzoom: s.maxzoom, roundZoom, terrain, calculateTileZoom: s.calculateTileZoom })) each(s, id);
        }
      }
      afterFrame();
      if (i % 100 === 0) {
        onProgress(from + (span * i) / times.length);
        await new Promise((r) => setTimeout(r));
        if (!alive()) return false;
      }
    }
    return true;
  };

  try {
    if (lod.stable) {
      // first the levels the camera alone would load, then each place keeps the finest of them throughout
      const pins: Record<string, Pins> = {};
      lod.pins = undefined;
      const ok = await sweep((s, { canonical: c }) => addTile((pins[s.id] ??= createPins()), c.z, c.x, c.y), () => {}, 0, 0.5);
      if (!ok) return undefined;
      lod.pins = pins;
    }
    const urls = new Set<string>(), cuts: number[] = [];
    const ok = await sweep(
      (s, id) => urls.add(id.canonical.url(s.tiles, map.getPixelRatio(), s.scheme).replace('dem://', 'https://')),
      () => cuts.push(urls.size),
      lod.stable ? 0.5 : 0, lod.stable ? 0.5 : 1,
    );
    return ok ? { times, cuts, urls: [...urls] } : undefined;
  } finally {
    lod.detail = detail;
  }
}
