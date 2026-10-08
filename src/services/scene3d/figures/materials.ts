import * as THREE from 'three';

// Built-in figures: Y up, nose towards +Z, ~1 unit long, resting on y = 0.
export type V3 = [number, number, number];
export const PI = Math.PI;

export function mat(color: number, roughness = 0.45, metalness = 0.1, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness, side: THREE.DoubleSide, ...extra });
}
export const paint = (color: number) => mat(color, 0.28, 0.35, { clearcoat: 1, clearcoatRoughness: 0.08 });
export const chrome = () => mat(0xe8ebef, 0.12, 1);
export const rubber = () => mat(0x1a1a1c, 0.85, 0);
export const darkGlass = () => mat(0x10161f, 0.05, 0.6, { clearcoat: 1 });
export const glass = () => mat(0x8fb8d8, 0.05, 0.2, { transparent: true, opacity: 0.55, clearcoat: 1 });
export const lamp = (color: number) => mat(color, 0.3, 0, { emissive: color, emissiveIntensity: 1.4 });

export function mesh(geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale?: V3) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(...pos);
  o.rotation.set(...rot);
  if (scale) o.scale.set(...scale);
  return o;
}

export function group(...children: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.add(...children);
  return g;
}

/** cylinder between two points */
export function rod(a: V3, b: V3, r: number, m: THREE.Material, seg = 10) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), seg), m);
  o.position.copy(va).add(vb).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize());
  return o;
}

/** side profile in (z forward, y up), extruded symmetrically across x */
export function sideExtrude(pts: [number, number][] | THREE.Shape, width: number, bevel = 0.02, curveSegs = 12) {
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
export function topExtrude(pts: [number, number][], height: number, bevel = 0.004) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 });
  geo.rotateX(-PI / 2);
  return geo;
}

/** lathe along +z from samples of radius(t), t: 0 tail → 1 nose */
export function latheZ(radius: (t: number) => number, length: number, n = 48, seg = 32) {
  const pts = Array.from({ length: n + 1 }, (_, i) => new THREE.Vector2(Math.max(1e-4, radius(i / n)), (i / n) * length - length / 2));
  const geo = new THREE.LatheGeometry(pts, seg);
  geo.rotateX(PI / 2);
  return geo;
}

export function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
