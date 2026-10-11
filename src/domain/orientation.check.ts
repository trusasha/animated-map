import assert from 'node:assert/strict';
import { AXES, normalizeAngle, resetPoseAngles, rotatePose, setPoseAngle, type Vec3 } from './orientation';
import type { ModelPose } from './types';

const P = (rx: number, ry: number, rz: number, scale = 1): ModelPose => ({ rx, ry, rz, scale });
const r = Math.PI / 180;

// the 3D engine's Euler 'YXZ': v' = Ry · Rx · Rz · v
function apply({ rx, ry, rz }: ModelPose, [x, y, z]: Vec3): Vec3 {
  [x, y] = [x * Math.cos(rz * r) - y * Math.sin(rz * r), x * Math.sin(rz * r) + y * Math.cos(rz * r)];
  [y, z] = [y * Math.cos(rx * r) - z * Math.sin(rx * r), y * Math.sin(rx * r) + z * Math.cos(rx * r)];
  [z, x] = [z * Math.cos(ry * r) - x * Math.sin(ry * r), z * Math.sin(ry * r) + x * Math.cos(ry * r)];
  return [x, y, z];
}
const near = (a: Vec3, b: Vec3, msg: string) => assert.ok(a.every((v, i) => Math.abs(v - b[i]) < 2e-3), `${msg}: ${a} vs ${b}`);
const PROBES: Vec3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.3, -0.7, 0.5]];

assert.equal(normalizeAngle(0), 0);
assert.equal(normalizeAngle(190), -170);
assert.equal(normalizeAngle(-180), 180);
assert.equal(normalizeAngle(540), 180);
assert.equal(normalizeAngle(-725.04), -5);
assert.ok(Object.is(normalizeAngle(-0.01), 0), 'no negative zero');

assert.deepEqual(rotatePose(P(0, 0, 0), AXES.ry, 90), P(0, 90, 0), 'heading step is plain ry');
assert.deepEqual(rotatePose(P(10, 30, 0), AXES.ry, -90), P(10, -60, 0), 'heading is the outermost turn');
assert.deepEqual(rotatePose(P(0, 0, 0), AXES.rx, 90), P(90, 0, 0));
assert.deepEqual(rotatePose(P(0, 0, 0), AXES.rz, -90), P(0, 0, -90));
assert.equal(rotatePose(P(0, 0, 0, 1.7), AXES.rx, 90).scale, 1.7, 'scale untouched');
const same = P(12, 34, 56);
assert.equal(rotatePose(same, AXES.rx, 0), same, 'zero turn keeps identity');
assert.equal(rotatePose(same, [0, 0, 0], 45), same, 'no axis keeps identity');

// every rotation is a turn of the whole figure around a frame axis, whatever the pose already was
for (const start of [P(0, 0, 0), P(20, -35, 70), P(-60, 150, -10), P(90, 0, 0)]) {
  for (const [key, axis] of Object.entries(AXES)) {
    for (const deg of [90, -90, 37]) {
      const out = rotatePose(start, axis, deg);
      const turned = (v: Vec3) => {
        const a = { rx: key === 'rx' ? deg : 0, ry: key === 'ry' ? deg : 0, rz: key === 'rz' ? deg : 0, scale: 1 };
        return apply(a, apply(start, v));
      };
      for (const v of PROBES) near(apply(out, v), turned(v), `${key} ${deg} from ${JSON.stringify(start)}`);
      for (const k of ['rx', 'ry', 'rz'] as const) assert.ok(out[k] > -180 && out[k] <= 180, 'angles stay in range');
    }
  }
}

// four quarter turns around any axis come back to the start (no drift from rounding)
for (const axis of Object.values(AXES)) {
  let p = P(15, -40, 25);
  for (let i = 0; i < 4; i++) p = rotatePose(p, axis, 90);
  for (const v of PROBES) near(apply(p, v), apply(P(15, -40, 25), v), 'full circle');
}

// an arbitrary drag axis
const tilted: Vec3 = [1, 1, 0];
const dragged = rotatePose(P(0, 0, 0), tilted, 180);
near(apply(dragged, [1, 0, 0]), [0, 1, 0], 'half turn around the diagonal swaps X and Y');

assert.deepEqual(setPoseAngle(P(1, 2, 3), 'ry', '-45'), P(1, -45, 3));
assert.deepEqual(setPoseAngle(P(1, 2, 3), 'rx', '370'), P(10, 2, 3));
assert.deepEqual(setPoseAngle(P(1, 2, 3), 'rz', '12,5'), P(1, 2, 12.5), 'comma decimal');
assert.deepEqual(setPoseAngle(P(1, 2, 3), 'rz', ''), P(1, 2, 3), 'empty keeps the value');
assert.deepEqual(setPoseAngle(P(1, 2, 3), 'rz', 'abc'), P(1, 2, 3), 'garbage keeps the value');
assert.deepEqual(resetPoseAngles(P(1, 2, 3, 1.4)), P(0, 0, 0, 1.4));

console.log('orientation ok');
