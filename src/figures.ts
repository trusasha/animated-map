import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CustomModel, ModelPose } from './types';

const DEG = Math.PI / 180;

// Built-in figures: Y up, nose towards +Z, ~1 unit long, resting on y = 0.
type V3 = [number, number, number];
const PI = Math.PI;

function mat(color: number, roughness = 0.45, metalness = 0.1, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness, side: THREE.DoubleSide, ...extra });
}
const paint = (color: number) => mat(color, 0.28, 0.35, { clearcoat: 1, clearcoatRoughness: 0.08 });
const chrome = () => mat(0xe8ebef, 0.12, 1);
const rubber = () => mat(0x1a1a1c, 0.85, 0);
const darkGlass = () => mat(0x10161f, 0.05, 0.6, { clearcoat: 1 });
const glass = () => mat(0x8fb8d8, 0.05, 0.2, { transparent: true, opacity: 0.55, clearcoat: 1 });
const lamp = (color: number) => mat(color, 0.3, 0, { emissive: color, emissiveIntensity: 1.4 });

function mesh(geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale?: V3) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(...pos);
  o.rotation.set(...rot);
  if (scale) o.scale.set(...scale);
  return o;
}

function group(...children: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.add(...children);
  return g;
}

/** cylinder between two points */
function rod(a: V3, b: V3, r: number, m: THREE.Material, seg = 10) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), seg), m);
  o.position.copy(va).add(vb).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize());
  return o;
}

/** side profile in (z forward, y up), extruded symmetrically across x */
function sideExtrude(pts: [number, number][] | THREE.Shape, width: number, bevel = 0.02, curveSegs = 12) {
  const shape = Array.isArray(pts) ? new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))) : pts;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, width - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: curveSegs,
  });
  geo.rotateY(-PI / 2);
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  geo.translate(-(bb.min.x + bb.max.x) / 2, 0, 0);
  return geo;
}

/** top-down outline in (x right, z forward) extruded upward */
function topExtrude(pts: [number, number][], height: number, bevel = 0.004) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 });
  geo.rotateX(-PI / 2);
  return geo;
}

/** lathe along +z from samples of radius(t), t: 0 tail → 1 nose */
function latheZ(radius: (t: number) => number, length: number, n = 48, seg = 32) {
  const pts = Array.from({ length: n + 1 }, (_, i) => new THREE.Vector2(Math.max(1e-4, radius(i / n)), (i / n) * length - length / 2));
  const geo = new THREE.LatheGeometry(pts, seg);
  geo.rotateX(PI / 2);
  return geo;
}

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** flat textured panel on both sides of a vehicle, centered at (y, z) */
function sideDecals(tex: THREE.Texture, halfWidth: number, length: number, height: number, y: number, z: number) {
  const m = mat(0xffffff, 0.3, 0.1, { map: tex, transparent: true, clearcoat: 0.6 });
  return [-1, 1].map((s) => mesh(new THREE.PlaneGeometry(length, height), m, [s * halfWidth, y, z], [0, (s * PI) / 2, 0]));
}

function car_wheel(r: number, w: number, rim = 0xc9ced6) {
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

function bike_wheel(r: number, tireR: number, spokes = 18, m = chrome()) {
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
function rider(o: { hip: V3; shoulder: V3; hands: V3; feet: V3; jacket: number; helmet: number; scale?: number }) {
  const s = o.scale ?? 1;
  const jacket = mat(o.jacket, 0.7), pants = mat(0x2b2f3a, 0.8), skin = mat(0xe0ac7e, 0.6);
  const [hx, hy, hz] = o.hip, [sx, sy, sz] = o.shoulder;
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

const builders: Record<string, () => THREE.Group> = {
  airplane() {
    const L = 1, R = 0.058, Y = 0.1;
    const livery = canvasTexture(1024, 512, (c) => {
      c.fillStyle = '#f7f9fb'; c.fillRect(0, 0, 1024, 512);
      c.fillStyle = '#1d4e89'; c.fillRect(0, 0, 1024 * 0.13, 512); c.fillRect(1024 * 0.87, 0, 1024 * 0.13, 512);
      c.fillStyle = '#e63946'; c.fillRect(1024 * 0.13, 0, 14, 512); c.fillRect(1024 * 0.87 - 14, 0, 14, 512);
      c.fillStyle = '#1f2a37';
      for (const x of [0.29, 0.71]) {
        for (let y = 0.2; y < 0.78; y += 0.016) c.beginPath(), c.roundRect(1024 * x - 7, 512 * (1 - y) - 4, 14, 8, 4), c.fill();
        c.fillRect(1024 * x - 14, 512 * 0.62, 28, 22);
      }
      c.fillStyle = '#121a24';
      c.beginPath(); c.moveTo(1024 * 0.3, 512 * 0.065); c.lineTo(1024 * 0.7, 512 * 0.065); c.lineTo(1024 * 0.66, 512 * 0.09); c.lineTo(1024 * 0.34, 512 * 0.09); c.fill();
    });
    const body = mat(0xffffff, 0.3, 0.2, { map: livery, clearcoat: 0.8, clearcoatRoughness: 0.1 });
    const white = paint(0xf2f4f7), accent = paint(0x1d4e89), red = paint(0xe63946), metal = mat(0xb9c0c9, 0.3, 0.8);
    const fuselage = mesh(latheZ((t) => {
      if (t < 0.22) return R * (0.25 + 0.75 * Math.sin((t / 0.22) * PI / 2));
      if (t > 0.86) return R * Math.sqrt(Math.max(0, 1 - ((t - 0.86) / 0.14) ** 2)) ** 0.8;
      return R;
    }, L), body, [0, Y, 0]);

    const wing = (span: number, root: number, tip: number, sweep: number, thick: number) => {
      const shape = new THREE.Shape([
        new THREE.Vector2(0, root / 2), new THREE.Vector2(span, root / 2 - sweep),
        new THREE.Vector2(span, root / 2 - sweep - tip), new THREE.Vector2(0, -root / 2),
      ]);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: thick / 2, bevelSize: thick / 2, bevelSegments: 3 });
      geo.rotateX(PI / 2);
      return geo;
    };
    const g = group(fuselage);
    for (const s of [-1, 1]) {
      const w = mesh(wing(0.48, 0.24, 0.05, 0.2, 0.008), white, [s * R * 0.5, Y - R * 0.45, 0.04], [0, 0, s * 0.08], [s, 1, 1]);
      const winglet = mesh(wing(0.05, 0.05, 0.025, 0.035, 0.004), accent, [s * (R * 0.5 + 0.48), Y - R * 0.45 + 0.04, 0.04 - 0.2 + 0.015], [0, 0, s * (PI / 2 - 0.25)], [s, 1, 1]);
      const stab = mesh(wing(0.16, 0.1, 0.035, 0.08, 0.005), white, [s * R * 0.2, Y + 0.012, -0.43], [0, 0, s * 0.12], [s, 1, 1]);
      const nacelle = mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.13, 24, 1, true), accent, [s * 0.17, Y - 0.07, 0.11], [PI / 2, 0, 0]);
      const intake = mesh(new THREE.TorusGeometry(0.029, 0.005, 8, 24), metal, [s * 0.17, Y - 0.07, 0.175]);
      const fan = mesh(new THREE.CircleGeometry(0.027, 20), mat(0x2a2f36, 0.4, 0.8), [s * 0.17, Y - 0.07, 0.165]);
      const exhaust = mesh(new THREE.ConeGeometry(0.018, 0.04, 16), metal, [s * 0.17, Y - 0.07, 0.03], [-PI / 2, 0, 0]);
      const pylon = mesh(new THREE.BoxGeometry(0.008, 0.04, 0.09), white, [s * 0.17, Y - 0.045, 0.1]);
      const gear = group(rod([0, 0.045, 0], [0, 0.015, 0], 0.005, metal), mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 14), rubber(), [0, 0.014, 0], [0, 0, PI / 2]));
      gear.position.set(s * 0.07, 0, -0.02);
      g.add(w, winglet, stab, nacelle, intake, fan, exhaust, pylon, gear);
    }
    const finShape = new THREE.Shape([new THREE.Vector2(-0.36, 0), new THREE.Vector2(-0.47, 0.17), new THREE.Vector2(-0.51, 0.17), new THREE.Vector2(-0.5, 0)]);
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 });
    finGeo.rotateY(-PI / 2);
    finGeo.scale(-1, 1, 1);
    const fin = mesh(finGeo, accent, [0.003, Y + R * 0.6, 0]);
    const finStripe = mesh(new THREE.BoxGeometry(0.014, 0.012, 0.09), red, [0, Y + R * 0.6 + 0.1, -0.455], [0.5, 0, 0]);
    const noseGear = group(rod([0, 0.06, 0], [0, 0.015, 0], 0.004, metal), mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.01, 12), rubber(), [0, 0.012, 0], [0, 0, PI / 2]));
    noseGear.position.set(0, 0, 0.38);
    const beacon = mesh(new THREE.SphereGeometry(0.006, 8, 8), lamp(0xff3030), [0, Y + R, 0.05]);
    g.add(fin, finStripe, noseGear, beacon);
    return g;
  },

  helicopter() {
    const body = paint(0xe63946), dark = mat(0x23272f, 0.5, 0.4), metal = mat(0x9aa3ad, 0.3, 0.9);
    const cabin = mesh(new THREE.SphereGeometry(0.17, 32, 24), body, [0, 0.24, 0.08], [0, 0, 0], [0.9, 0.85, 1.25]);
    const canopy = mesh(new THREE.SphereGeometry(0.172, 32, 24, PI / 2 - 1.1, 2.2, 0.3, 1.2), mat(0x1c3550, 0.05, 0.5, { clearcoat: 1 }), [0, 0.25, 0.1], [0, 0, 0], [0.9, 0.85, 1.25]);
    const boom = mesh(new THREE.CylinderGeometry(0.022, 0.06, 0.5, 20), body, [0, 0.29, -0.3], [PI / 2 - 0.08, 0, 0]);
    const finShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-0.06, 0.15), new THREE.Vector2(-0.11, 0.15), new THREE.Vector2(-0.08, -0.04)]);
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.008, bevelEnabled: false });
    finGeo.rotateY(-PI / 2);
    const fin = mesh(finGeo, body, [0.004, 0.31, -0.5]);
    const stab = mesh(new THREE.BoxGeometry(0.16, 0.008, 0.04), body, [0, 0.31, -0.46]);
    const engine = mesh(new THREE.CapsuleGeometry(0.06, 0.12, 6, 16), mat(0xd5d9de, 0.4, 0.6), [0, 0.4, -0.03], [PI / 2, 0, 0]);
    const mast = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.07, 12), metal, [0, 0.47, 0.05]);
    const rotor = new THREE.Group();
    rotor.position.set(0, 0.51, 0.05);
    rotor.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), dark));
    for (let i = 0; i < 4; i++) rotor.add(mesh(new THREE.BoxGeometry(0.035, 0.006, 0.52), dark, [Math.sin((i * PI) / 2) * 0.27, 0, Math.cos((i * PI) / 2) * 0.27], [0, (i * PI) / 2, 0.06]));
    rotor.userData.spin = 28;
    const tail = new THREE.Group();
    tail.position.set(0.02, 0.37, -0.55);
    tail.add(mesh(new THREE.BoxGeometry(0.004, 0.13, 0.016), dark), mesh(new THREE.BoxGeometry(0.004, 0.016, 0.13), dark));
    tail.userData.spinX = 50;
    const g = group(cabin, canopy, boom, fin, stab, engine, mast, rotor, tail);
    for (const s of [-1, 1]) {
      g.add(rod([s * 0.13, 0.015, -0.2], [s * 0.13, 0.015, 0.25], 0.011, metal));
      g.add(rod([s * 0.13, 0.015, 0.25], [s * 0.13, 0.04, 0.29], 0.011, metal));
      g.add(rod([s * 0.13, 0.015, -0.1], [s * 0.08, 0.13, -0.08], 0.008, metal));
      g.add(rod([s * 0.13, 0.015, 0.15], [s * 0.08, 0.13, 0.15], 0.008, metal));
    }
    g.add(mesh(new THREE.SphereGeometry(0.008, 8, 8), lamp(0xff3030), [0, 0.38, -0.56]));
    return g;
  },

  car() {
    const red = paint(0xd62839), trim = mat(0x16181c, 0.5, 0.3);
    const W = 0.4, wr = 0.088, axle = 0.285;
    const p = new THREE.Shape();
    p.moveTo(-0.47, 0.1);
    p.lineTo(-axle - wr - 0.02, 0.07);
    p.absarc(-axle, wr, wr + 0.018, PI, 0, true);
    p.lineTo(axle - wr - 0.018, 0.07);
    p.absarc(axle, wr, wr + 0.018, PI, 0, true);
    p.lineTo(0.47, 0.08);
    p.quadraticCurveTo(0.49, 0.15, 0.45, 0.2);
    p.quadraticCurveTo(0.33, 0.235, 0.17, 0.25);
    p.quadraticCurveTo(0.1, 0.33, 0.02, 0.365);
    p.quadraticCurveTo(-0.1, 0.385, -0.22, 0.37);
    p.quadraticCurveTo(-0.33, 0.33, -0.38, 0.26);
    p.quadraticCurveTo(-0.45, 0.255, -0.47, 0.23);
    p.lineTo(-0.47, 0.1);
    const bevel = 0.045;
    const bodyGeo = new THREE.ExtrudeGeometry(p, { depth: W - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 6, curveSegments: 24 });
    bodyGeo.rotateY(-PI / 2);
    bodyGeo.translate((W - 2 * bevel) / 2, 0, 0);
    const win = new THREE.Shape();
    win.moveTo(0.168, 0.258);
    win.quadraticCurveTo(0.1, 0.335, 0.02, 0.372);
    win.lineTo(-0.2, 0.374);
    win.quadraticCurveTo(-0.32, 0.335, -0.385, 0.265);
    win.lineTo(0.168, 0.258);
    const winGeo = new THREE.ExtrudeGeometry(win, { depth: W - 0.05, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.004, bevelSegments: 3, curveSegments: 16 });
    winGeo.rotateY(-PI / 2);
    winGeo.translate((W - 0.05) / 2, 0.002, 0);
    const g = group(mesh(bodyGeo, red), mesh(winGeo, darkGlass()));
    g.add(mesh(new THREE.BoxGeometry(W + 0.012, 0.11, 0.028), red, [0, 0.315, -0.07], [-0.08, 0, 0]));
    for (const z of [-axle, axle]) for (const s of [-1, 1]) {
      const w = car_wheel(wr, 0.075);
      w.position.set(s * (W / 2 - 0.035), wr, z);
      g.add(w);
    }
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.CapsuleGeometry(0.018, 0.05, 4, 10), lamp(0xfff5d6), [s * 0.13, 0.185, 0.462], [0, 0, PI / 2]));
      g.add(mesh(new THREE.BoxGeometry(0.1, 0.028, 0.012), lamp(0xff1a1a), [s * 0.12, 0.215, -0.49]));
      g.add(mesh(new THREE.BoxGeometry(0.035, 0.028, 0.05), red, [s * 0.215, 0.29, 0.13], [0, s * 0.2, 0]));
      g.add(mesh(new THREE.BoxGeometry(0.004, 0.012, 0.05), mat(0x8a9099, 0.3, 0.9), [s * (W / 2 + 0.002), 0.235, -0.03]));
    }
    g.add(mesh(new THREE.BoxGeometry(0.17, 0.045, 0.012), trim, [0, 0.13, 0.485]));
    g.add(mesh(new THREE.BoxGeometry(W - 0.01, 0.03, 0.03), trim, [0, 0.085, 0.47]), mesh(new THREE.BoxGeometry(W - 0.01, 0.03, 0.03), trim, [0, 0.095, -0.48]));
    g.add(mesh(new THREE.BoxGeometry(0.09, 0.028, 0.004), mat(0xf4f4f4, 0.5), [0, 0.15, -0.493]));
    return g;
  },

  motorcycle() {
    // adventure tourer: tall, spoked wheels, panniers, rider upright
    const orange = paint(0xff6b00), black = mat(0x1b1d22, 0.5, 0.4), metal = chrome(), frame = mat(0x30343b, 0.4, 0.7);
    const rf = 0.135, rr = 0.125;
    const front = bike_wheel(rf, 0.025), rear = bike_wheel(rr, 0.03);
    front.position.set(0, rf + 0.005, 0.33);
    rear.position.set(0, rr + 0.005, -0.31);
    const g = group(front, rear);
    for (const s of [-1, 1]) {
      g.add(rod([s * 0.035, rf, 0.33], [s * 0.04, 0.45, 0.22], 0.012, metal));
      g.add(rod([s * 0.04, rr, -0.31], [s * 0.03, 0.27, -0.02], 0.012, frame));
      g.add(mesh(new THREE.BoxGeometry(0.09, 0.14, 0.2), black, [s * 0.11, 0.3, -0.26], [0, 0, 0], [1, 1, 1]));
      g.add(mesh(new THREE.BoxGeometry(0.004, 0.11, 0.17), mat(0x8c939c, 0.3, 0.9), [s * 0.157, 0.3, -0.26]));
    }
    g.add(mesh(new THREE.TorusGeometry(rf + 0.02, 0.012, 6, 20, PI * 0.7), orange, [0, rf + 0.005, 0.33], [0, PI / 2, PI * 0.15]));
    g.add(mesh(new THREE.CapsuleGeometry(0.07, 0.12, 8, 20), orange, [0, 0.39, 0.1], [PI / 2 + 0.25, 0, 0], [1.15, 1, 1]));
    g.add(mesh(sideExtrude([[0.0, 0.0], [0.13, -0.02], [0.17, 0.06], [0.06, 0.1]], 0.16, 0.02), orange, [0, 0.33, 0.13]));
    g.add(mesh(new THREE.BoxGeometry(0.13, 0.13, 0.15), mat(0x60666e, 0.35, 0.8), [0, 0.22, 0.05]));
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.045, 0.3), black, [0, 0.4, -0.12], [-0.08, 0, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.03, 0.18), black, [0, 0.42, -0.36]));
    g.add(rod([0.06, 0.19, -0.05], [0.07, 0.3, -0.4], 0.02, metal, 14));
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 16), metal, [0.08, 0.31, -0.41], [PI / 2 - 0.3, 0, 0]));
    g.add(rod([-0.15, 0.53, 0.2], [0.15, 0.53, 0.2], 0.009, black));
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 20), lamp(0xfff2c8), [0, 0.43, 0.3], [PI / 2, 0, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.15, 0.13, 0.008), glass(), [0, 0.54, 0.25], [-0.45, 0, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.02, 0.01), lamp(0xff1a1a), [0, 0.42, -0.455]));
    g.add(rider({ hip: [0.06, 0.45, -0.13], shoulder: [0, 0.74, -0.06], hands: [0.14, 0.54, 0.19], feet: [0.11, 0.2, -0.05], jacket: 0x2f6f4f, helmet: 0xf1f1f1 }));
    return g;
  },

  sportbike() {
    const blue = paint(0x1149d6), white = paint(0xf3f4f6), black = mat(0x16181d, 0.45, 0.4), gold = mat(0xffc107, 0.35, 0.6);
    const r = 0.12;
    const front = bike_wheel(r, 0.032, 6, gold), rear = bike_wheel(r, 0.042, 6, gold);
    front.position.set(0, r + 0.005, 0.34);
    rear.position.set(0, r + 0.005, -0.32);
    const g = group(front, rear);
    for (const s of [-1, 1]) {
      g.add(rod([s * 0.04, r, 0.34], [s * 0.045, 0.43, 0.22], 0.013, mat(0xd4a017, 0.3, 0.9)));
      g.add(rod([s * 0.05, r, -0.32], [s * 0.04, 0.24, -0.03], 0.014, black));
    }
    const fairing = new THREE.Shape();
    fairing.moveTo(0.37, 0.37);
    fairing.quadraticCurveTo(0.32, 0.47, 0.2, 0.5);
    fairing.lineTo(0.12, 0.45);
    fairing.lineTo(0.0, 0.33);
    fairing.quadraticCurveTo(-0.03, 0.17, 0.07, 0.14);
    fairing.lineTo(0.17, 0.15);
    fairing.quadraticCurveTo(0.2, 0.26, 0.26, 0.28);
    fairing.quadraticCurveTo(0.34, 0.29, 0.37, 0.37);
    g.add(mesh(sideExtrude(fairing, 0.19, 0.045, 24), blue));
    const stripe = new THREE.Shape();
    stripe.moveTo(0.33, 0.36);
    stripe.quadraticCurveTo(0.22, 0.33, 0.06, 0.2);
    stripe.lineTo(0.08, 0.18);
    stripe.quadraticCurveTo(0.22, 0.3, 0.34, 0.33);
    g.add(mesh(sideExtrude(stripe, 0.196, 0.045, 16), white));
    g.add(mesh(new THREE.SphereGeometry(0.08, 24, 16), blue, [0, 0.465, 0.04], [0.15, 0, 0], [0.85, 0.55, 1.35]));
    const tail = new THREE.Shape();
    tail.moveTo(-0.02, 0.45);
    tail.lineTo(-0.2, 0.46);
    tail.quadraticCurveTo(-0.34, 0.49, -0.43, 0.53);
    tail.lineTo(-0.41, 0.49);
    tail.quadraticCurveTo(-0.25, 0.39, -0.04, 0.37);
    g.add(mesh(sideExtrude(tail, 0.13, 0.035, 20), blue));
    const seat = new THREE.Shape();
    seat.moveTo(-0.03, 0.47);
    seat.lineTo(-0.2, 0.478);
    seat.lineTo(-0.22, 0.495);
    seat.quadraticCurveTo(-0.1, 0.495, -0.02, 0.485);
    g.add(mesh(sideExtrude(seat, 0.11, 0.02, 12), black));
    g.add(mesh(new THREE.BoxGeometry(0.13, 0.09, 0.008), darkGlass(), [0, 0.505, 0.26], [-0.95, 0, 0]));
    for (const s of [-1, 1]) g.add(mesh(new THREE.CapsuleGeometry(0.01, 0.03, 4, 8), lamp(0xe8f4ff), [s * 0.035, 0.38, 0.365], [0.6, 0, PI / 2 + s * 0.4]));
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.09, 0.14), mat(0x3b3f46, 0.4, 0.7), [0, 0.2, 0.06]));
    g.add(mesh(new THREE.CylinderGeometry(0.028, 0.038, 0.15, 16), mat(0xb8bec6, 0.2, 1), [0.06, 0.33, -0.33], [PI / 2 - 0.45, 0, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.015, 0.01), lamp(0xff1a1a), [0, 0.5, -0.42], [0.4, 0, 0]));
    g.add(rider({ hip: [0.06, 0.5, -0.13], shoulder: [0, 0.62, 0.06], hands: [0.1, 0.47, 0.22], feet: [0.1, 0.26, -0.17], jacket: 0x1149d6, helmet: 0xf3f4f6 }));
    return g;
  },

  bus() {
    const L = 1, W = 0.3, H = 0.36;
    const side = canvasTexture(1024, 256, (c) => {
      c.fillStyle = '#ffc300'; c.fillRect(0, 0, 1024, 256);
      c.fillStyle = '#1b2735'; c.fillRect(0, 50, 1024, 95);
      c.fillStyle = '#ffc300';
      for (let x = 70; x < 1024; x += 118) c.fillRect(x, 50, 10, 95);
      c.fillStyle = '#1d4e89'; c.fillRect(0, 180, 1024, 22);
      c.fillStyle = '#ffffff'; c.font = 'bold 40px sans-serif'; c.fillText('CITY TOURS', 380, 238);
    });
    const body = mat(0xffffff, 0.35, 0.2, { map: side, clearcoat: 0.6 });
    const yellow = paint(0xffc300);
    const g = group(mesh(new THREE.BoxGeometry(W, H, L - 0.02), [body, body, yellow, yellow, yellow, yellow], [0, 0.08 + H / 2, 0]));
    g.add(mesh(new THREE.BoxGeometry(W * 0.92, H * 0.45, 0.01), darkGlass(), [0, 0.08 + H * 0.66, L / 2 - 0.008]));
    g.add(mesh(new THREE.BoxGeometry(W * 0.6, 0.04, 0.012), lamp(0xffa000), [0, 0.08 + H - 0.03, L / 2 - 0.004]));
    g.add(mesh(new THREE.BoxGeometry(W * 0.92, H * 0.3, 0.01), darkGlass(), [0, 0.08 + H * 0.7, -L / 2 + 0.008]));
    g.add(mesh(new THREE.BoxGeometry(W * 0.7, 0.03, 0.3), mat(0xd9dde2, 0.4, 0.5), [0, 0.08 + H + 0.015, -0.05]));
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.BoxGeometry(0.04, 0.025, 0.008), lamp(0xfff5d6), [s * 0.1, 0.13, L / 2 - 0.004]));
      g.add(mesh(new THREE.BoxGeometry(0.03, 0.05, 0.008), lamp(0xff1a1a), [s * 0.12, 0.15, -L / 2 + 0.004]));
      g.add(rod([s * W / 2, 0.42, L / 2 - 0.02], [s * (W / 2 + 0.04), 0.38, L / 2 + 0.02], 0.005, mat(0x111111)));
    }
    g.add(mesh(new THREE.BoxGeometry(W + 0.006, 0.05, L), mat(0x2b2f36, 0.6), [0, 0.1, 0]));
    for (const z of [-0.3, 0.32]) for (const s of [-1, 1]) {
      const w = car_wheel(0.075, 0.055, 0xd0d4da);
      w.position.set(s * (W / 2 - 0.015), 0.075, z);
      g.add(w);
    }
    return g;
  },

  train() {
    const W = 0.2;
    const windows = canvasTexture(1024, 128, (c) => {
      c.fillStyle = '#1d3557'; c.fillRect(0, 22, 1024, 52);
      c.fillStyle = '#0f1720';
      for (let x = 24; x < 1000; x += 46) c.beginPath(), c.roundRect(x, 30, 34, 36, 7), c.fill();
      c.fillStyle = '#e63946'; c.fillRect(0, 96, 1024, 12);
    });
    const shell = paint(0xf4f6f8);
    const nose = new THREE.Shape();
    nose.moveTo(-0.02, 0.05);
    nose.lineTo(0.36, 0.05);
    nose.quadraticCurveTo(0.5, 0.06, 0.5, 0.1);
    nose.quadraticCurveTo(0.45, 0.2, 0.25, 0.25);
    nose.lineTo(-0.02, 0.25);
    const geo = (sh: THREE.Shape) => {
      const g = new THREE.ExtrudeGeometry(sh, { depth: W - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 6, curveSegments: 24 });
      g.rotateY(-PI / 2);
      g.translate((W - 0.06) / 2, 0, 0);
      return g;
    };
    const coachShape = new THREE.Shape([new THREE.Vector2(-0.5, 0.05), new THREE.Vector2(-0.05, 0.05), new THREE.Vector2(-0.05, 0.25), new THREE.Vector2(-0.5, 0.25)]);
    const shield = new THREE.Shape();
    shield.moveTo(0.4, 0.165);
    shield.quadraticCurveTo(0.34, 0.22, 0.24, 0.245);
    shield.lineTo(0.22, 0.24);
    shield.quadraticCurveTo(0.31, 0.205, 0.36, 0.16);
    const shieldGeo = new THREE.ExtrudeGeometry(shield, { depth: W * 0.7, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.008, bevelSegments: 3 });
    shieldGeo.rotateY(-PI / 2);
    shieldGeo.translate(W * 0.35, 0.004, 0);
    const g = group(mesh(geo(nose), shell), mesh(geo(coachShape), shell), mesh(shieldGeo, darkGlass()));
    g.add(...sideDecals(windows, W / 2 + 0.031, 0.42, 0.13, 0.15, -0.28), ...sideDecals(windows, W / 2 + 0.031, 0.18, 0.13, 0.15, 0.1));
    g.add(mesh(new THREE.BoxGeometry(W * 0.9, 0.19, 0.04), mat(0x1b1d22, 0.8), [0, 0.15, -0.035]));
    for (const s of [-1, 1]) g.add(mesh(new THREE.CapsuleGeometry(0.008, 0.03, 4, 8), lamp(0xfff5d6), [s * 0.05, 0.085, 0.5], [0, 0, PI / 2]));
    g.add(rod([0, 0.28, 0.1], [0, 0.34, 0.0], 0.004, mat(0x222222)), rod([0, 0.34, 0.0], [0, 0.34, -0.08], 0.004, mat(0x222222)));
    for (const z of [-0.4, -0.2, 0.15, 0.33]) for (const s of [-1, 1]) {
      const w = car_wheel(0.032, 0.02, 0x666b73);
      w.position.set(s * 0.075, 0.035, z);
      g.add(w);
    }
    for (const z of [-0.3, 0.24]) g.add(mesh(new THREE.BoxGeometry(W * 0.85, 0.03, 0.2), mat(0x2a2d33, 0.6, 0.5), [0, 0.045, z]));
    return g;
  },

  bicycle() {
    const frameM = paint(0x00a676), black = mat(0x1d1f24, 0.5, 0.3), metal = chrome();
    const r = 0.15;
    const front = bike_wheel(r, 0.012, 20), rear = bike_wheel(r, 0.012, 20);
    front.position.set(0, r + 0.005, 0.3);
    rear.position.set(0, r + 0.005, -0.3);
    const bb: V3 = [0, 0.16, -0.02], seat: V3 = [0, 0.4, -0.1], head: V3 = [0, 0.4, 0.2], rearHub: V3 = [0, r, -0.3];
    const g = group(front, rear,
      rod(bb, seat, 0.012, frameM), rod(seat, head, 0.011, frameM), rod(bb, [0, 0.38, 0.19], 0.013, frameM),
      rod(bb, rearHub, 0.008, frameM), rod(seat, rearHub, 0.008, frameM), rod(head, [0, r, 0.3], 0.01, metal),
      rod(seat, [0, 0.45, -0.12], 0.008, metal), mesh(new THREE.BoxGeometry(0.06, 0.02, 0.12), black, [0, 0.46, -0.12]),
      rod(head, [0, 0.46, 0.18], 0.009, metal), rod([-0.11, 0.46, 0.18], [0.11, 0.46, 0.18], 0.008, black),
      mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 20), metal, bb, [0, 0, PI / 2]),
    );
    g.add(rider({ hip: [0.05, 0.47, -0.11], shoulder: [0, 0.68, 0.04], hands: [0.1, 0.47, 0.18], feet: [0.06, 0.13, 0.02], jacket: 0xef476f, helmet: 0xffd166 }));
    return g;
  },

  ship() {
    const hullTop: [number, number][] = [[-0.12, -0.48], [0.12, -0.48], [0.13, -0.3], [0.13, 0.2], [0.09, 0.38], [0, 0.5], [-0.09, 0.38], [-0.13, 0.2], [-0.13, -0.3]];
    const g = group(
      mesh(topExtrude(hullTop, 0.035), paint(0xb5192e)),
      mesh(topExtrude(hullTop, 0.07), paint(0x14213d), [0, 0.035, 0]),
      mesh(topExtrude(hullTop.map(([x, z]) => [x * 1.01, z * 1.005]), 0.006, 0), paint(0xf4f6f8), [0, 0.1, 0]),
      mesh(topExtrude([[-0.12, -0.46], [0.12, -0.46], [0.12, 0.2], [0.07, 0.36], [-0.07, 0.36], [-0.12, 0.2]], 0.004, 0), mat(0x9c6b3f, 0.7), [0, 0.106, 0]),
    );
    const windows = canvasTexture(512, 64, (c) => {
      c.fillStyle = '#2a3b55';
      for (let x = 4; x < 512; x += 14) c.fillRect(x, 22, 9, 20);
    });
    windows.wrapS = THREE.RepeatWrapping;
    const deck = paint(0xf6f7f9);
    const decks: [number, number, number, number][] = [[0.11, -0.4, 0.22, 0.05], [0.1, -0.36, 0.17, 0.05], [0.085, -0.3, 0.12, 0.045], [0.06, -0.2, 0.06, 0.045]];
    decks.forEach(([hw, z0, z1, h], i) => {
      const y = 0.11 + i * 0.05;
      g.add(mesh(topExtrude([[-hw, z0], [hw, z0], [hw, z1 - 0.03], [hw * 0.6, z1], [-hw * 0.6, z1], [-hw, z1 - 0.03]], h, 0.003), deck, [0, y, 0]));
      const len = z1 - z0 - 0.04, t = windows.clone();
      t.repeat.set(len * 4, 1);
      g.add(...sideDecals(t, hw + 0.004, len, h * 0.9, y + h / 2, (z0 + z1 - 0.03) / 2));
    });
    g.add(mesh(new THREE.BoxGeometry(0.13, 0.03, 0.05), darkGlass(), [0, 0.29, 0.03]));
    for (const z of [-0.22, -0.32]) {
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.11, 20), paint(0xd62828), [0, 0.37, z], [-0.15, 0, 0]));
      g.add(mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.025, 20), mat(0x111111), [0, 0.425, z - 0.008], [-0.15, 0, 0]));
    }
    for (const s of [-1, 1]) for (let z = -0.32; z < 0.12; z += 0.085) {
      g.add(mesh(new THREE.CapsuleGeometry(0.012, 0.035, 4, 10), paint(0xff8c00), [s * 0.118, 0.19, z], [PI / 2, 0, 0]));
    }
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.004, 0.06), mat(0x4cc9f0, 0.1, 0.1), [0, 0.162, 0.1]));
    g.add(rod([0, 0.3, 0.06], [0, 0.4, 0.06], 0.004, mat(0xdddddd)));
    return g;
  },

  sailboat() {
    const hull = mesh(topExtrude([[-0.1, -0.38], [0.1, -0.38], [0.12, -0.1], [0.1, 0.18], [0, 0.42], [-0.1, 0.18], [-0.12, -0.1]], 0.09, 0.01), paint(0xf4f4f2));
    const stripe = mesh(topExtrude([[-0.104, -0.385], [0.104, -0.385], [0.124, -0.1], [0.104, 0.18], [0, 0.425], [-0.104, 0.18], [-0.124, -0.1]], 0.012, 0), paint(0x1d3557), [0, 0.06, 0]);
    const deck = mesh(topExtrude([[-0.09, -0.36], [0.09, -0.36], [0.1, -0.1], [0.085, 0.17], [0, 0.38], [-0.085, 0.17], [-0.1, -0.1]], 0.004, 0), mat(0xb08452, 0.7), [0, 0.095, 0]);
    const cabin = mesh(sideExtrude([[-0.22, 0.1], [0.08, 0.1], [0.04, 0.15], [-0.2, 0.15]], 0.12, 0.012), paint(0xf4f4f2));
    const portholes = mesh(sideExtrude([[-0.16, 0.115], [0.02, 0.115], [0.0, 0.135], [-0.15, 0.135]], 0.125, 0.004), darkGlass());
    const mastM = mat(0xc0c6cc, 0.3, 0.9);
    const sailM = mat(0xfffdf6, 0.85, 0, { side: THREE.DoubleSide });
    const sail = (pts: [number, number][], belly: number) => {
      const geo = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))), 12);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(Math.min(1, Math.max(0, (p.getX(i) - pts[0][0]) / 0.3)) * PI) * belly * (1 - p.getY(i) / 1.3));
      geo.rotateY(-PI / 2);
      return mesh(geo, sailM);
    };
    const g = group(hull, stripe, deck, cabin, portholes,
      rod([0, 0.1, 0.06], [0, 0.95, 0.06], 0.008, mastM), rod([0, 0.22, 0.05], [0, 0.22, -0.32], 0.006, mastM),
      sail([[0.05, 0.23], [-0.32, 0.23], [0.05, 0.92]], 0.05), sail([[0.4, 0.12], [0.08, 0.15], [0.07, 0.86]], 0.035),
      rod([0, 0.95, 0.06], [0, 0.11, 0.41], 0.002, mat(0x333333)),
    );
    g.add(mesh(new THREE.ConeGeometry(0.02, 0.05, 3), paint(0xe63946), [0, 0.97, 0.06], [0, 0, -PI / 2], [1, 1, 0.2]));
    return g;
  },
};

export const FIGURE_IDS = Object.keys(builders);

export const FIGURE_LABELS: Record<string, string> = {
  airplane: 'Самолёт', helicopter: 'Вертолёт', car: 'Машина', motorcycle: 'Мотоцикл-эндуро',
  sportbike: 'Спортбайк', bus: 'Автобус', train: 'Поезд', bicycle: 'Велосипед', ship: 'Лайнер', sailboat: 'Парусник',
};

const loader = new GLTFLoader();
const glbCache = new Map<string, Promise<THREE.Group>>();
const poses = new Map<string, ModelPose>();

/** Call whenever custom models change; poses are applied on the next createFigure. */
export function setModelPoses(models: CustomModel[]) {
  poses.clear();
  for (const m of models) if (m.url && m.pose) poses.set(m.url, m.pose);
}

/** cache key for anything built from a figure id: changes when the model's pose does */
export function figureKey(id: string, pose = id.startsWith('model:') && poses.get(id.slice(6))) {
  return pose ? `${id}#${pose.rx},${pose.ry},${pose.rz},${pose.scale}` : id;
}

/** centers on x/z, rests on y=0, longest side = 1 unit */
function normalize(obj: THREE.Object3D) {
  obj.position.set(0, 0, 0);
  obj.scale.setScalar(1);
  obj.updateMatrixWorld(true);
  const box3 = new THREE.Box3().setFromObject(obj);
  const size = box3.getSize(new THREE.Vector3());
  const s = 1 / Math.max(size.x, size.y, size.z, 1e-6);
  const center = box3.getCenter(new THREE.Vector3());
  obj.position.set(-center.x * s, -box3.min.y * s, -center.z * s);
  obj.scale.setScalar(s);
}

/** Normalizes any GLB into the figure convention: Y up, longest horizontal side along Z, ~1 unit long. */
function loadGlb(url: string) {
  if (!glbCache.has(url)) {
    glbCache.set(url, loader.loadAsync(url).then((gltf) => {
      const root = gltf.scene;
      const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
      // ponytail: photo→3D models face the camera, so a side photo yields a vehicle lying along X; nose direction is a guess (+X), the editor flips it
      if (size.x > size.z * 1.1) root.rotation.y = -Math.PI / 2;
      normalize(root);
      return group(group(root));
    }));
  }
  return glbCache.get(url)!.then((g) => g.clone(true));
}

/** figure id → object; custom ids are `model:<url>` */
export async function createFigure(id: string, pose?: ModelPose): Promise<THREE.Group> {
  if (id.startsWith('model:')) {
    try {
      const g = await loadGlb(id.slice(6));
      pose ??= poses.get(id.slice(6));
      if (pose) {
        const inner = g.children[0];
        inner.rotation.set(pose.rx * DEG, pose.ry * DEG, pose.rz * DEG, 'YXZ');
        normalize(inner);
        inner.scale.multiplyScalar(pose.scale);
        inner.position.multiplyScalar(pose.scale);
      }
      return g;
    } catch (e) { console.warn('GLB failed', e); }
  }
  return (builders[id] ?? builders.airplane)();
}

export function animateFigure(g: THREE.Object3D, time: number) {
  g.traverse((o) => {
    if (o.userData.spin) o.rotation.y = time * o.userData.spin;
    if (o.userData.spinX) o.rotation.x = time * o.userData.spinX;
    if (o.userData.roll) o.rotation.x = (time * 0.35) / o.userData.roll;
  });
}
