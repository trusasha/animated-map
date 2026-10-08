import assert from 'node:assert/strict';
import { greatCircle, simplify, distance } from '../geo';
import { buildTimeline, sample, slicePath, HOLD, INTRO, SWAP } from './index';
import type { LngLat } from '../types';

const fit = (b: [number, number, number, number]) => ({ zoom: 10 - Math.log2(1 + Math.max(b[2] - b[0], b[3] - b[1])), center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] as LngLat });
const stops = [
  { id: 'a', name: 'Moscow', lng: 37.6, lat: 55.75 },
  { id: 'b', name: 'Tokyo', lng: 139.7, lat: 35.7 },
  { id: 'c', name: 'Honolulu', lng: -157.8, lat: 21.3 },
  { id: 'd', name: 'Waikiki', lng: -157.83, lat: 21.28 },
];
const legs = [
  { mode: 'air' as const, figure: 'airplane', path: greatCircle([37.6, 55.75], [139.7, 35.7]) },
  { mode: 'water' as const, figure: 'ship', path: greatCircle([139.7, 35.7], [-157.8, 21.3]) },
  { mode: 'ground' as const, figure: 'car', path: [[-157.8, 21.3], [-157.81, 21.29], [-157.83, 21.28]] as LngLat[] },
];
const tl = buildTimeline(stops, legs, 1, fit);

assert.equal(tl.legs[0].start, INTRO);
assert.ok(Math.abs(tl.legs[1].start - tl.legs[0].end - SWAP) < 1e-9);
// antimeridian: second leg continues east past 180 instead of jumping back
assert.ok(tl.legs[1].path.at(-1)![0] > 180, 'water leg unwrapped across antimeridian');
assert.ok(Math.abs(tl.legs[2].path[0][0] - tl.legs[1].path.at(-1)![0]) < 1e-6, 'legs continuous');

let prevLeg = 0;
for (let t = 0; t <= tl.duration; t += 1 / 30) {
  const f = sample(tl, t);
  assert.ok(Number.isFinite(f.pos[0]) && Number.isFinite(f.camera.zoom) && Number.isFinite(f.heading), `finite @${t}`);
  assert.ok(f.legIndex >= prevLeg, 'leg index monotonic');
  assert.ok(f.alt >= 0 && f.scale >= 0, 'alt/scale non-negative');
  prevLeg = f.legIndex;
}
const mid = sample(tl, (tl.legs[0].start + tl.legs[0].end) / 2);
assert.ok(mid.alt > 0.9 * tl.legs[0].peak, 'plane peaks mid-flight');
assert.equal(sample(tl, tl.legs[2].start + 0.01).figure, 'car');
assert.ok(Math.abs(sample(tl, tl.legs[0].end).pos[0] - 139.7) < 1e-6, 'arrives at Tokyo');
assert.equal(sample(tl, tl.duration).progress, 1);
assert.equal(slicePath(tl.legs[0], 1).at(-1)![2] < 1, true, 'lands at alt 0');

const zig: LngLat[] = Array.from({ length: 200 }, (_, i) => [i * 0.001, (i % 2) * 0.00001]);
assert.ok(simplify(zig, 0.0001).length === 2, 'simplify flattens jitter');
assert.ok(Math.abs(distance([0, 0], [1, 0]) - 111195) < 10);
const slow = buildTimeline(stops, legs.map((l, i) => (i === 2 ? { ...l, speed: 0.5 } : l)), 1, fit);
const dur = (t: typeof tl, i: number) => t.legs[i].end - t.legs[i].start;
assert.ok(Math.abs(dur(slow, 2) - 2 * dur(tl, 2)) < 1e-9, 'leg speed 0.5 doubles its duration');
assert.ok(Math.abs(dur(slow, 0) - dur(tl, 0)) < 1e-9, 'other legs untouched');

// right-angle zigzag every ~800 m at ~4 km/s: worst case; heading must still turn over several frames, not snap 90°
const zz: LngLat[] = [];
for (let i = 0; i <= 10; i++) zz.push([30 + Math.ceil(i / 2) * 0.01, 40 + Math.floor(i / 2) * 0.01]);
const road = buildTimeline(stops.slice(0, 2), [{ mode: 'ground', figure: 'car', path: zz }], 1, () => ({ zoom: 13, center: [30, 40] }));
let maxTurn = 0, prev: number | undefined;
for (let t = road.legs[0].start; t <= road.legs[0].end; t += 1 / 30) {
  const h = sample(road, t).heading;
  if (prev !== undefined) maxTurn = Math.max(maxTurn, Math.abs(((h - prev + 540) % 360) - 180));
  prev = h;
}
assert.ok(maxTurn < 45, `heading changes smoothly (max ${maxTurn.toFixed(1)}°/frame)`);
const exact = buildTimeline(stops.slice(0, 2), [{ mode: 'ground', figure: 'car', path: zz, smooth: 0 }], 1, () => ({ zoom: 13, center: [30, 40] }));
assert.deepEqual(exact.legs[0].path, zz, 'smooth 0 keeps the road as is');
const offRoad = (k: number) => {
  const p = buildTimeline(stops.slice(0, 2), [{ mode: 'ground', figure: 'car', path: zz, smooth: k }], 1, () => ({ zoom: 13, center: [30, 40] })).legs[0].path;
  return Math.max(...zz.map((q) => Math.min(...p.map((r) => distance(q, r)))));
};
assert.ok(offRoad(2) > offRoad(1) && offRoad(1) > offRoad(0.5), 'more smoothing strays further from the road');
assert.ok(distance(road.legs[0].path.at(-1)!, zz.at(-1)!) < 0.01 && distance(road.legs[0].path[0], zz[0]) < 0.01, 'smoothing keeps stops exact');
// short hop next to a long one: the filter window outgrows the leg (used to read past the mirrored copy)
const tiny: LngLat[] = [[30, 40], [30.0003, 40.0001], [30.0006, 40]];
const hop = buildTimeline(stops.slice(0, 2), [{ mode: 'ground', figure: 'bicycle', path: tiny, smooth: 4 }], 1, () => ({ zoom: 3, center: [30, 40] }));
assert.ok(hop.legs[0].path.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), 'tiny leg smooths without crashing');
// same figure on both sides of a stop: no shrink/spin swap, a short pause that turns toward the next leg
const twoRides = buildTimeline(stops.slice(0, 3), [
  { mode: 'ground', figure: 'car', path: [[30, 40], [30.1, 40]] },
  { mode: 'ground', figure: 'car', path: [[30.1, 40], [30.1, 40.1]] },
], 1, () => ({ zoom: 10, center: [30, 40] }));
const [r0, r1] = twoRides.legs;
assert.ok(Math.abs(r1.start - r0.end - HOLD) < 1e-9, 'same figure pauses for HOLD');
let prevH = sample(twoRides, r0.end).heading;
for (let t = r0.end; t <= r1.start; t += 1 / 30) {
  const f = sample(twoRides, t);
  assert.ok(f.scale === 1 && f.spin === 0, 'no swap animation for the same figure');
  assert.ok(Math.abs(f.pos[0] - 30.1) < 1e-9 && Math.abs(f.pos[1] - 40) < 1e-9, 'stands still at the stop');
  assert.ok(Math.abs(((f.heading - prevH + 540) % 360) - 180) < 10, 'turns gradually during the pause');
  prevH = f.heading;
}
assert.ok(Math.abs(sample(twoRides, r1.start - 1e-6).heading - sample(twoRides, r1.start + 1e-6).heading) < 2, 'leaves facing the next leg');
// colour is data only: it must not move a single frame
const painted = buildTimeline(stops, legs.map((l, i) => ({ ...l, color: ['#ff0000', '#00ff00', '#0000ff'][i] })), 1, fit);
const uncoloured = (t: typeof tl) => t.legs.map((l) => { const c = { ...l }; delete c.color; return c; });
assert.deepEqual(uncoloured(painted), uncoloured(tl), 'colour does not change the timeline');
assert.deepEqual(painted.legs.map((l) => l.color), ['#ff0000', '#00ff00', '#0000ff'], 'colour is passed through to the legs');
assert.equal(painted.duration, tl.duration);
for (let t = 0; t <= tl.duration; t += 0.25) assert.deepEqual(sample(painted, t), sample(tl, t), `frame @${t}`);
console.log('timeline ok, duration', tl.duration.toFixed(1), 's, max turn', maxTurn.toFixed(1), '°/frame');
