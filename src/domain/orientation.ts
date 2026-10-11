import type { ModelPose } from './types';

/** Figure frame used by playback: +X right, +Y up, +Z the direction of travel. */
export type Vec3 = [number, number, number];
export type AngleKey = 'rx' | 'ry' | 'rz';
type Quat = [number, number, number, number];

const DEG = Math.PI / 180;

export const AXES: Record<AngleKey, Vec3> = { rx: [1, 0, 0], ry: [0, 1, 0], rz: [0, 0, 1] };

/** degrees into (-180, 180], rounded to 0.1° */
export function normalizeAngle(deg: number) {
  const a = Math.round(((((deg + 180) % 360) + 360) % 360 - 180) * 10) / 10;
  return a === -180 ? 180 : a === 0 ? 0 : a;
}

/** quaternion of the pose, Euler order YXZ like the 3D engine applies it */
function poseQuat({ rx, ry, rz }: ModelPose): Quat {
  const [c1, c2, c3] = [rx, ry, rz].map((a) => Math.cos((a * DEG) / 2));
  const [s1, s2, s3] = [rx, ry, rz].map((a) => Math.sin((a * DEG) / 2));
  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 - s1 * s2 * c3,
    c1 * c2 * c3 + s1 * s2 * s3,
  ];
}

function quatAngles([x, y, z, w]: Quat): Pick<ModelPose, AngleKey> {
  const m13 = 2 * (x * z + w * y), m23 = 2 * (y * z - w * x), m33 = 1 - 2 * (x * x + y * y);
  const m21 = 2 * (x * y + w * z), m22 = 1 - 2 * (x * x + z * z);
  const m11 = 1 - 2 * (y * y + z * z), m31 = 2 * (x * z - w * y);
  const rx = Math.asin(-Math.max(-1, Math.min(1, m23)));
  const locked = Math.abs(m23) >= 0.9999999;
  const ry = locked ? Math.atan2(-m31, m11) : Math.atan2(m13, m33);
  const rz = locked ? 0 : Math.atan2(m21, m22);
  return { rx: normalizeAngle(rx / DEG), ry: normalizeAngle(ry / DEG), rz: normalizeAngle(rz / DEG) };
}

const mul = ([ax, ay, az, aw]: Quat, [bx, by, bz, bw]: Quat): Quat => [
  aw * bx + ax * bw + ay * bz - az * by,
  aw * by - ax * bz + ay * bw + az * bx,
  aw * bz + ax * by - ay * bx + az * bw,
  aw * bw - ax * bx - ay * by - az * bz,
];

/** turns the figure by `deg` around an axis of the figure frame (not of the model), keeping its scale */
export function rotatePose(pose: ModelPose, axis: Vec3, deg: number): ModelPose {
  const len = Math.hypot(...axis);
  if (!len || !deg) return pose;
  const s = Math.sin((deg * DEG) / 2) / len;
  const turn: Quat = [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos((deg * DEG) / 2)];
  return { ...quatAngles(mul(turn, poseQuat(pose))), scale: pose.scale };
}

/** a typed-in angle; anything that is not a number leaves the pose as it was */
export function setPoseAngle(pose: ModelPose, key: AngleKey, text: string): ModelPose {
  const v = Number(text.replace(',', '.').trim());
  return text.trim() && Number.isFinite(v) ? { ...pose, [key]: normalizeAngle(v) } : pose;
}

export const resetPoseAngles = (pose: ModelPose): ModelPose => ({ rx: 0, ry: 0, rz: 0, scale: pose.scale });
