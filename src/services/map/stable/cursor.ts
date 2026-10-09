import type { Map as MlMap } from 'maplibre-gl';

/**
 * The tile MapLibre's coveringTiles is deciding on. It hands calculateTileZoom distances only, never the tile, but
 * calls the projection's distanceToTile2d(…, tile) right before with the distance it then passes on: `d` ties the two.
 */
export const cursor = { z: 0, x: 0, y: 0, d: Number.NaN, calls: 0, hits: 0 };

type Tile = { z: number; x: number; y: number };
type Provider = { distanceToTile2d(px: number, py: number, tile: Tile, bv: unknown): number };
type Transform = { getCoveringTilesDetailsProvider(): Provider; _verticalPerspectiveTransform?: Transform; _mercatorTransform?: Transform };

const patched = new WeakSet<object>();

/** patches the providers' classes, so clones of the transform and later projection switches report too */
export function trackCoveringTiles(map: MlMap) {
  const t = (map as unknown as { _camera: { transform: Transform } })._camera.transform;
  const protos = new Set([t, t._verticalPerspectiveTransform, t._mercatorTransform].flatMap((tr) => (tr ? [Object.getPrototypeOf(tr.getCoveringTilesDetailsProvider()) as Provider] : [])));
  // globe and mercator each have their own provider; fewer means MapLibre's internals moved
  if (protos.size < 2 || [...protos].some((p) => typeof p.distanceToTile2d !== 'function')) throw new Error('stable tiles: MapLibre covering internals changed');
  for (const proto of protos) {
    if (patched.has(proto)) continue;
    patched.add(proto);
    const base = proto.distanceToTile2d;
    proto.distanceToTile2d = function (px, py, tile, bv) {
      const d = base.call(this, px, py, tile, bv);
      cursor.z = tile.z; cursor.x = tile.x; cursor.y = tile.y; cursor.d = d;
      return d;
    };
  }
}
