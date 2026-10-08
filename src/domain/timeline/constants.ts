import { EARTH_RADIUS, distance } from '../geo';
import type { LngLat } from '../types';

/** on-screen figure length in CSS px; the animator sizes the 3D model from it */
export const FIG_PX = 76;
export const INTRO = 2.2, SWAP = 1.4, OUTRO = 3;
/** stop between two legs with the same figure: it just pauses there and turns to the next leg */
export const HOLD = 1;
export const MAX_ZOOM = 14;
/** fastest the figure may turn, °/s; with the local speed this sets the minimum turn radius */
export const MAX_TURN = 1080;
/** bends smaller than this on screen are road noise, not route shape */
export const MIN_BEND_PX = 10;

export const metersPerPx = (zoom: number, lat: number) => (2 * Math.PI * EARTH_RADIUS * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpLL = (a: LngLat, b: LngLat, t: number): LngLat => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export const cumulative = (path: LngLat[]) => {
  const cum = [0];
  for (let k = 1; k < path.length; k++) cum.push(cum[k - 1] + distance(path[k - 1], path[k]));
  return cum;
};
