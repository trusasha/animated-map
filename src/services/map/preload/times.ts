import { sample, type Frame, type Timeline } from '../../../domain/timeline';

const rad = Math.PI / 180;
const PRELOAD_STEP = 1 / 15;

/**
 * camera samples for planning tiles (px, zoom, pitch°, max step s): consecutive views overlap by ~3/4 of the
 * screen and the detail lock keeps tile levels steady between them, so nothing in between is missed
 */
export const FINE = [250, 0.25, 5, PRELOAD_STEP * 4] as const;
/** stable export: a fixed level per leg draws finer tiles mid-leg, so frames between samples reach past their union at the edges */
export const DENSE = [125, 0.25, 5, PRELOAD_STEP * 2] as const;

export function preloadTimes(tl: Timeline, [px, dz, dp, step]: readonly [number, number, number, number]) {
  const merc = ({ center: [x, y], zoom }: Frame['camera']) =>
    [(x / 360) * 512 * 2 ** zoom, (Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, y)) * rad) / 2)) / (2 * Math.PI)) * 512 * 2 ** zoom];
  const far = (a: Frame['camera'], b: Frame['camera']) => {
    const z = Math.max(a.zoom, b.zoom), pa = merc({ ...a, zoom: z }), pb = merc({ ...b, zoom: z });
    return Math.abs(a.zoom - b.zoom) > dz || Math.abs(a.pitch - b.pitch) > dp || Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) > px;
  };
  const times = [0];
  for (let t = 0; t < tl.duration;) {
    const a = sample(tl, t).camera;
    let dt = step;
    while (dt > 0.002 && far(a, sample(tl, t + dt).camera)) dt /= 2;
    times.push((t = Math.min(t + dt, tl.duration)));
  }
  return times;
}
