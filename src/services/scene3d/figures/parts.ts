import * as THREE from 'three';
import { chrome, darkGlass, group, mat, mesh, paint, PI, rod, rubber, type V3 } from './materials';

/** flat textured panel on both sides of a vehicle, centered at (y, z) */
export function sideDecals(tex: THREE.Texture, halfWidth: number, length: number, height: number, y: number, z: number) {
  const m = mat(0xffffff, 0.3, 0.1, { map: tex, transparent: true, clearcoat: 0.6 });
  return [-1, 1].map((s) => mesh(new THREE.PlaneGeometry(length, height), m, [s * halfWidth, y, z], [0, (s * PI) / 2, 0]));
}

export function car_wheel(r: number, w: number, rim = 0xc9ced6) {
  const tire = mesh(new THREE.TorusGeometry(r * 0.72, r * 0.28, 14, 28), rubber(), [0, 0, 0], [0, PI / 2, 0], [1, 1, w / (r * 0.56)]);
  const disc = mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w * 0.7, 24), mat(rim, 0.25, 0.9), [0, 0, 0], [0, 0, PI / 2]);
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * PI * 2;
    return mesh(new THREE.BoxGeometry(w * 0.74, r * 0.12, r * 1.05), mat(0x8a9099, 0.3, 0.9), [0, 0, 0], [a, 0, 0]);
  });
  const hub = mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, w * 0.78, 12), chrome(), [0, 0, 0], [0, 0, PI / 2]);
  const g = group(tire, disc, ...spokes, hub);
  g.userData.roll = r;
  return g;
}

export function bike_wheel(r: number, tireR: number, spokes = 18, m = chrome()) {
  const tire = mesh(new THREE.TorusGeometry(r, tireR, 10, 40), rubber(), [0, 0, 0], [0, PI / 2, 0]);
  const rimRing = mesh(new THREE.TorusGeometry(r - tireR * 0.9, tireR * 0.35, 6, 40), m, [0, 0, 0], [0, PI / 2, 0]);
  const g = group(tire, rimRing);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * PI * 2, side = i % 2 ? 1 : -1;
    g.add(rod([side * tireR * 0.6, 0, 0], [0, Math.sin(a) * (r - tireR), Math.cos(a) * (r - tireR)], tireR * 0.08, m, 4));
  }
  g.add(mesh(new THREE.CylinderGeometry(tireR * 0.9, tireR * 0.9, tireR * 2.2, 12), m, [0, 0, 0], [0, 0, PI / 2]));
  g.userData.roll = r;
  return g;
}

/** seated rider; hands/feet points are where limbs end */
export function rider(o: { hip: V3; shoulder: V3; hands: V3; feet: V3; jacket: number; helmet: number; scale?: number }) {
  const s = o.scale ?? 1;
  const jacket = mat(o.jacket, 0.7), pants = mat(0x2b2f3a, 0.8), skin = mat(0xe0ac7e, 0.6);
  const [hx, hy, hz] = o.hip, [, sy, sz] = o.shoulder;
  const g = new THREE.Group();
  g.add(rod([0, hy, hz], [0, sy, sz], 0.045 * s, jacket, 12));
  g.add(mesh(new THREE.SphereGeometry(0.05 * s, 16, 12), jacket, [0, sy, sz]));
  const head: V3 = [0, sy + 0.075 * s, sz + 0.01 * s];
  g.add(mesh(new THREE.SphereGeometry(0.052 * s, 20, 16), paint(o.helmet), head));
  g.add(mesh(new THREE.SphereGeometry(0.053 * s, 20, 12, PI / 2 - 0.9, 1.8, 1.1, 0.7), darkGlass(), head));
  for (const side of [-1, 1]) {
    const shoulder: V3 = [side * 0.055 * s, sy - 0.01 * s, sz];
    const hand: V3 = [side * o.hands[0], o.hands[1], o.hands[2]];
    const elbow: V3 = [side * (o.hands[0] + 0.02 * s), (shoulder[1] + hand[1]) / 2 - 0.03 * s, (shoulder[2] + hand[2]) / 2];
    g.add(rod(shoulder, elbow, 0.022 * s, jacket), rod(elbow, hand, 0.02 * s, jacket));
    g.add(mesh(new THREE.SphereGeometry(0.022 * s, 8, 8), skin, hand));
    const hip: V3 = [side * hx, hy, hz];
    const foot: V3 = [side * o.feet[0], o.feet[1], o.feet[2]];
    const knee: V3 = [side * (hx + 0.03 * s), hip[1] - 0.03 * s, Math.max(hz, foot[2]) + 0.13 * s];
    g.add(rod(hip, knee, 0.03 * s, pants), rod(knee, foot, 0.026 * s, pants));
    g.add(mesh(new THREE.BoxGeometry(0.035 * s, 0.03 * s, 0.07 * s), rubber(), [foot[0], foot[1], foot[2] + 0.02 * s]));
  }
  return g;
}
