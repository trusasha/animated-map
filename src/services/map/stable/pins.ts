/**
 * One source's tile level per place, fixed for the whole video: the finest level any planned frame asks for there.
 * `need` maps a quadtree node to the finest level at or below it, so MapLibre's top-down traversal descends exactly
 * to it whatever the camera does; `leaf` holds the tiles the frames asked for.
 */
export interface Pins { need: Map<number, number>; leaf: Set<number> }

/** tile levels may go at most this many levels finer than the camera alone would load (each level = 4× tiles) */
export const PIN_CAP = 4;

const index = (z: number, x: number, y: number) => (4 ** z - 1) / 3 + y * 2 ** z + x;

export const createPins = (): Pins => ({ need: new Map(), leaf: new Set() });

export function addTile(p: Pins, z: number, x: number, y: number) {
  p.leaf.add(index(z, x, y));
  for (let k = z; k >= 0; k--) {
    const i = index(k, x >> (z - k), y >> (z - k));
    // ancestors of a node already at z or finer are too
    if ((p.need.get(i) ?? -1) >= z) break;
    p.need.set(i, z);
  }
}

/** a planned place keeps its level; `level` (the camera's own choice) only caps it and fills unplanned places */
export function pinnedZoom(p: Pins, z: number, x: number, y: number, level: number) {
  const need = p.need.get(index(z, x, y));
  if (need !== undefined) return Math.min(need, level + PIN_CAP);
  for (let k = z - 1; k >= 0; k--) if (p.leaf.has(index(k, x >> (z - k), y >> (z - k)))) return z;
  return level;
}
