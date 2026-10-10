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

type Levels = Record<string, number>;

/**
 * per ground/water leg, the level each source loads at the leg's closest camera (its start, at zClose), lowered
 * as a whole while any frame of the leg would load more than the budget, then shared along runs of ground/water legs.
 * `levelsAt` reads the single level the current camera loads per source; `countAt(t, levels)` the largest
 * per-source tile count at time t with `levels` forced.
 */
export function planLegLevels(tl: Timeline, times: number[], levelsAt: (t: number) => Levels, countAt: (t: number, levels: Levels) => number) {
  const own = tl.legs.map((_, i) => times.filter((t) => { const s = stretchAt(tl, t); return s.kind === 'leg' && s.index === i; }));
  const fits = (i: number, levels: Levels) => Math.max(...own[i].map((t) => countAt(t, levels))) <= LEG_TILE_BUDGET;
  const levels = tl.legs.map((leg, i) => {
    if (leg.mode === 'air') return undefined;
    const l = levelsAt(leg.start);
    while (!fits(i, l) && Object.values(l).some((z) => z > 0)) for (const id in l) l[id] = Math.max(0, l[id] - 1);
    return l;
  });
  return shareFinerLevels(levels, fits);
}

/**
 * neighbouring legs take the finer of their levels wherever it fits the budget, repeated until nothing changes, so
 * a run of road legs switches photos as rarely as possible; undefined (air) breaks a run
 */
export function shareFinerLevels(levels: (Levels | undefined)[], fits: (i: number, levels: Levels) => boolean) {
  const out = levels.map((l) => l && { ...l });
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i + 1 < out.length; i++) {
      const a = out[i], b = out[i + 1];
      if (!a || !b) continue;
      const finer = Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((id) => [id, Math.max(a[id] ?? 0, b[id] ?? 0)]));
      for (const k of [i, i + 1]) {
        if (Object.entries(finer).some(([id, z]) => out[k]![id] !== z) && fits(k, finer)) { out[k] = { ...finer }; changed = true; }
      }
    }
  }
  return out;
}

/** planning times plus each side of every level change, so the frames right after a switch are planned too */
export function withSwitches(tl: Timeline, times: number[]) {
  const { legs } = tl;
  const at = [legs[0].start, legs.at(-1)!.end, ...legs.slice(1).map((l, i) => (legs[i].end + l.start) / 2)];
  return [...new Set([...times, ...at.flatMap((t) => [t - 1e-3, t + 1e-3])])].filter((t) => t >= 0 && t <= tl.duration).sort((a, b) => a - b);
}
