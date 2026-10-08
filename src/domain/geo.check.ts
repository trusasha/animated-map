import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bearing, distance, greatCircle, mercatorCoord, meterInMercatorUnits, simplify, unwrap } from './geo';
import type { LngLat } from './types';

const fixture: { lng: number; lat: number; alt: number; x: number; y: number; z: number; meterUnit: number }[] =
  JSON.parse(readFileSync(new URL('../../e2e/fixtures/baselines/mercator.json', import.meta.url), 'utf8'));
for (const p of fixture) {
  const m = mercatorCoord(p.lng, p.lat, p.alt);
  for (const k of ['x', 'y', 'z'] as const) assert.ok(Math.abs(m[k] - p[k]) <= 1e-12, `${k} @ ${p.lng},${p.lat},${p.alt}: ${m[k]} vs ${p[k]}`);
  assert.ok(Math.abs(meterInMercatorUnits(p.lat) - p.meterUnit) <= 1e-9 * p.meterUnit, `meterUnit @ ${p.lat}`);
}

assert.ok(Math.abs(distance([0, 0], [1, 0]) - 111195) < 10);
assert.ok(Math.abs(bearing([0, 0], [0, 1])) < 1e-9 && Math.abs(bearing([0, 0], [1, 0]) - 90) < 1e-9);
assert.deepEqual(unwrap([[179, 0], [-179, 0], [-177, 0]]), [[179, 0], [181, 0], [183, 0]], 'antimeridian unwrapped');
const gc = greatCircle([0, 0], [90, 0]);
assert.equal(gc.length, 97);
assert.ok(Math.abs(gc[48][0] - 45) < 1e-9 && Math.abs(gc[48][1]) < 1e-9);
assert.deepEqual(greatCircle([5, 5], [5, 5]), [[5, 5], [5, 5]]);
const zig: LngLat[] = Array.from({ length: 200 }, (_, i) => [i * 0.001, (i % 2) * 0.00001]);
assert.equal(simplify(zig, 0.0001).length, 2, 'simplify flattens jitter');

console.log('geo ok');
