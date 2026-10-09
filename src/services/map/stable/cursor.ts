import type { Map as MlMap } from 'maplibre-gl';

/**
 * The tile MapLibre's coveringTiles is deciding on. It hands calculateTileZoom distances only, never the tile, but
 * calls the projection's distanceToTile2d(…, tile) right before with the distance it then passes on: `d` ties the two.
 */
export const cursor = { z: 0, x: 0, y: 0, d: Number.NaN };

type Tile = { z: number; x: number; y: number };
type Provider = { distanceToTile2d(px: number, py: number, tile: Tile, bv: unknown): number };
type Transform = { getCoveringTilesDetailsProvider(): Provider; _verticalPerspectiveTransform?: Transform; _mercatorTransform?: Transform };

const patched = new WeakSet<object>();

/** patches the providers' classes, so clones of the transform and later projection switches report too */
export function trackCoveringTiles(map: MlMap) {
  const t = (map as unknown as { _camera: { transform: Transform } })._camera.transform;
  for (const tr of [t, t._verticalPerspectiveTransform, t._mercatorTransform]) {
    const proto = tr && Object.getPrototypeOf(tr.getCoveringTilesDetailsProvider()) as Provider;
    if (!proto || patched.has(proto)) continue;
    patched.add(proto);
    const base = proto.distanceToTile2d;
    proto.distanceToTile2d = function (px, py, tile, bv) {
      const d = base.call(this, px, py, tile, bv);
      cursor.z = tile.z; cursor.x = tile.x; cursor.y = tile.y; cursor.d = d;
      return d;
    };
  }
}
