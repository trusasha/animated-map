export type Snap = 'peek' | 'collapsed' | 'full';

export interface SnapSpec {
  /** Peek height, px. */
  peek: number;
  /** Collapsed height as a fraction of the container height. */
  collapsed: number;
  /** Gap left above the sheet when full, px. */
  fullInset: number;
}

export const DEFAULT_SPEC: SnapSpec = { peek: 120, collapsed: 0.46, fullInset: 72 };
export const VELOCITY_THRESHOLD = 0.5;

const ORDER: readonly Snap[] = ['peek', 'collapsed', 'full'];

export function snapHeights(spec: SnapSpec, containerHeight: number): Record<Snap, number> {
  const peek = Math.min(spec.peek, containerHeight);
  const collapsed = Math.max(peek, Math.round(containerHeight * spec.collapsed));
  const full = Math.max(collapsed, containerHeight - spec.fullInset);
  return { peek, collapsed, full };
}

export const clampHeight = (h: number, heights: Record<Snap, number>): number =>
  Math.min(heights.full, Math.max(heights.peek, h));

export function nearestSnap(h: number, heights: Record<Snap, number>): Snap {
  return ORDER.reduce((best, s) => (Math.abs(heights[s] - h) < Math.abs(heights[best] - h) ? s : best));
}

/** Snap to settle on after a drag; `velocity` is px/ms, positive when moving up. */
export function releaseSnap(h: number, velocity: number, heights: Record<Snap, number>): Snap {
  if (velocity > VELOCITY_THRESHOLD) return ORDER.find((s) => heights[s] > h + 1) ?? 'full';
  if (velocity < -VELOCITY_THRESHOLD) return [...ORDER].reverse().find((s) => heights[s] < h - 1) ?? 'peek';
  return nearestSnap(h, heights);
}

export const toggleSnap = (s: Snap): Snap => (s === 'peek' ? 'collapsed' : 'peek');

export function stepSnap(s: Snap, dir: 1 | -1): Snap {
  const i = ORDER.indexOf(s) + dir;
  return ORDER[Math.min(ORDER.length - 1, Math.max(0, i))];
}
