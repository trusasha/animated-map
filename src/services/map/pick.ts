import type { Map as MlMap, Point } from 'maplibre-gl';
import type { LngLat } from '../../domain/types';

/** how far from a drawn line a click still picks it, in CSS px */
const HIT_PX = 11;

export interface PointerTarget {
  /** segment clicks and the hover cursor apply only while this holds */
  active(): boolean;
  segment(i: number): void;
  empty(): void;
  /** the drawn segment paths, by segment index */
  paths(): LngLat[][];
}

const distToSegment = (p: Point, a: Point, b: Point) => {
  const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

/** routes map clicks to a pending pick, a segment of the hit layer, or empty map */
export function installPointer(map: MlMap, target: PointerTarget) {
  let pick: ((p: LngLat) => void) | null = null;
  const canvas = map.getCanvas();
  // screen-space test against map.project, which follows the terrain; queryRenderedFeatures does not, so on
  // mountains the clickable band sat well below the drawn line
  const hit = (point: Point): number | null => {
    if (!target.active()) return null;
    let best: number | null = null, bestD = HIT_PX;
    target.paths().forEach((path, i) => {
      let prev = path.length > 1 ? map.project(path[0]) : null;
      for (let k = 1; prev && k < path.length; k++) {
        const next = map.project(path[k]);
        const d = distToSegment(point, prev, next);
        if (d < bestD) { bestD = d; best = i; }
        prev = next;
      }
    });
    return best;
  };
  let hoverFrame = 0;

  map.on('click', (e) => {
    if (pick) {
      const cb = pick;
      pick = null;
      canvas.style.cursor = '';
      cb([e.lngLat.lng, e.lngLat.lat]);
      return;
    }
    if (!target.active()) return;
    const i = hit(e.point);
    if (i !== null) target.segment(i);
    else target.empty();
  });
  map.on('mousemove', (e) => {
    if (pick || !target.active() || hoverFrame) return;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0;
      canvas.style.cursor = hit(e.point) !== null ? 'pointer' : '';
    });
  });

  return {
    start(onPick: (p: LngLat) => void) {
      pick = onPick;
      canvas.style.cursor = 'crosshair';
      return () => {
        if (pick !== onPick) return;
        pick = null;
        canvas.style.cursor = '';
      };
    },
    cancel() {
      pick = null;
      canvas.style.cursor = '';
    },
  };
}
