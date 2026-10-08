import type { Map as MlMap } from 'maplibre-gl';
import { detailZoom, sample, type Timeline } from '../../../domain/timeline';
import { jumpToCamera } from '../fit';
import type { LodState } from '../lod';
import { FINE, preloadTimes } from './times';

/** tile URLs in timeline order; cuts[k] = how many of them cover everything up to times[k] */
export interface TilePlan { times: number[]; cuts: number[]; urls: string[] }

// coveringTiles options and source fields beyond the public typing
type TileSource = { type: string; tiles: string[]; tileSize?: number; minzoom: number; maxzoom: number; scheme?: string; calculateTileZoom: unknown };
type TileID = { canonical: { url(tiles: string[], pixelRatio: number, scheme?: string): string } };
type Covering = (o: object) => TileID[];

/** every tile URL the camera will need over the whole timeline; moves the camera without rendering */
export async function planTiles(map: MlMap, lod: LodState, tl: Timeline, alive: () => boolean, onProgress: (p: number) => void): Promise<TilePlan | undefined> {
  const sources = Object.keys(map.getStyle().sources).map((id) => map.getSource(id) as unknown as TileSource | undefined).filter((s) => s?.tiles) as TileSource[];
  const urls = new Set<string>();
  const times = preloadTimes(tl, FINE), cuts: number[] = [];
  const terrain = (map as unknown as { terrain: unknown }).terrain;
  const covering = map.coveringTiles.bind(map) as unknown as Covering;
  const detail = lod.detail;
  for (const [i, t] of times.entries()) {
    jumpToCamera(map, sample(tl, t).camera);
    lod.detail = detailZoom(tl, t);
    for (const s of sources) {
      // raster rounds the zoom, vector floors it; DEM serves both hillshade and terrain, which differ, so take both
      for (const roundZoom of s.type === 'raster' ? [true] : s.type === 'vector' ? [false] : [false, true]) {
        // terrain and the source's own zoom function: the same tile choice the renderer makes
        for (const id of covering({ tileSize: s.tileSize ?? 512, minzoom: s.minzoom, maxzoom: s.maxzoom, roundZoom, terrain, calculateTileZoom: s.calculateTileZoom })) {
          urls.add(id.canonical.url(s.tiles, map.getPixelRatio(), s.scheme).replace('dem://', 'https://'));
        }
      }
    }
    cuts.push(urls.size);
    if (i % 100 === 0) {
      onProgress(i / times.length);
      await new Promise((r) => setTimeout(r));
      if (!alive()) { lod.detail = detail; return undefined; }
    }
  }
  lod.detail = detail;
  return { times, cuts, urls: [...urls] };
}
