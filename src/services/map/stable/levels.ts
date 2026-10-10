import { stretchAt, type Timeline } from '../../../domain/timeline';
import type { LodState } from '../lod';

/** at most this many tiles of one source per frame; a leg over it drops its whole level by one */
export const LEG_TILE_BUDGET = 1500;

/** the tile-level rule for time t: a ground/water leg's fixed levels, an air leg's pins, or one level per frame */
export function applyStretch(lod: LodState, tl: Timeline, t: number) {
  if (!lod.stable) return;
  const s = stretchAt(tl, t);
  const leg = s.kind === 'leg' ? tl.legs[s.index] : undefined;
  lod.usePins = leg?.mode === 'air';
  lod.forced = leg && leg.mode !== 'air' && s.kind === 'leg' ? lod.legLevels?.[s.index] : undefined;
}

/**
 * per ground/water leg, the level each source loads at the leg's closest camera (its start, at zClose), lowered
 * as a whole while any frame of the leg would load more than the budget. `levelsAt` reads the single level the
 * current camera loads per source; `countAt(t, levels)` the largest per-source tile count at time t with `levels` forced.
 */
export function planLegLevels(
  tl: Timeline, times: number[], levelsAt: (t: number) => Record<string, number>, countAt: (t: number, levels: Record<string, number>) => number,
) {
  return tl.legs.map((leg, i) => {
    if (leg.mode === 'air') return undefined;
    const levels = levelsAt(leg.start);
    const own = times.filter((t) => { const s = stretchAt(tl, t); return s.kind === 'leg' && s.index === i; });
    while (Math.max(...own.map((t) => countAt(t, levels))) > LEG_TILE_BUDGET && Object.values(levels).some((z) => z > 0)) {
      for (const id in levels) levels[id] = Math.max(0, levels[id] - 1);
    }
    return levels;
  });
}

/** planning times plus each side of every level change, so the frames right after a switch are planned too */
export function withSwitches(tl: Timeline, times: number[]) {
  const { legs } = tl;
  const at = [legs[0].start, legs.at(-1)!.end, ...legs.slice(1).map((l, i) => (legs[i].end + l.start) / 2)];
  return [...new Set([...times, ...at.flatMap((t) => [t - 1e-3, t + 1e-3])])].filter((t) => t >= 0 && t <= tl.duration).sort((a, b) => a - b);
}
