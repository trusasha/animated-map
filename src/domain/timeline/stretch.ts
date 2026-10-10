import type { Timeline } from './types';

/** the part of the video that owns time t for map detail; a hold or swap belongs to the leg before its middle, the next one after */
export type Stretch = { kind: 'intro' | 'outro' } | { kind: 'leg'; index: number };

export function stretchAt(tl: Timeline, t: number): Stretch {
  const { legs } = tl;
  if (t < legs[0].start) return { kind: 'intro' };
  if (t > legs.at(-1)!.end) return { kind: 'outro' };
  for (let i = 0; i < legs.length - 1; i++) if (t < (legs[i].end + legs[i + 1].start) / 2) return { kind: 'leg', index: i };
  return { kind: 'leg', index: legs.length - 1 };
}
