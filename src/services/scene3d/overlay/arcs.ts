import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { slicePath, type Frame, type TLeg } from '../../../domain/timeline';

const HIGHLIGHT = '#ff4d6d';

export interface Arc { leg: TLeg; index: number; planned: Line2; casing: Line2; done: Line2 }

// opaque on purpose: translucent Line2 segments overlap at joints and render as beads
function line(color: number, width: number, order: number) {
  const l = new Line2(new LineGeometry(), new LineMaterial({ color, linewidth: width, depthWrite: order === 2 }));
  l.frustumCulled = false;
  l.renderOrder = order;
  l.userData.width = width;
  l.userData.color = color;
  return l;
}

// three caches an instanced geometry's draw count on first render, so a growing line needs a fresh geometry
function setLine(l: Line2, positions: number[]) {
  l.geometry.dispose();
  l.geometry = new LineGeometry().setPositions(positions);
}

/** air legs as planned/travelled 3D lines; same widths as the ground/water trail layers */
export function createArcs(legs: TLeg[]): Arc[] {
  return legs.flatMap((leg, index) => leg.mode !== 'air' ? [] : [{
    leg, index,
    planned: line(0xb9c4d2, 3, 0),
    casing: line(0x1c2230, 7.5, 1),
    done: line(0xffffff, 4.5, 2),
  }]);
}

export function removeArcs(scene: THREE.Scene, arcs: Arc[]) {
  for (const a of arcs) for (const l of [a.planned, a.casing, a.done]) { scene.remove(l); l.geometry.dispose(); }
}

export interface ArcFrame {
  /** lng, lat, alt → camera-relative world point */
  world(x: number, y: number, a: number): THREE.Vector3;
  origin: THREE.Vector3;
  /** ground height along a leg at a distance fraction */
  ramp(leg: TLeg): (frac: number) => number;
  frame?: Frame; selected: number | null; pixelRatio: number;
}

export function updateArcs(arcs: Arc[], gl: WebGL2RenderingContext, { world, origin, ramp, frame: f, selected, pixelRatio: pr }: ArcFrame) {
  for (const a of arcs) {
    const base = ramp(a.leg);
    const flat = (frac: number) => slicePath(a.leg, frac).flatMap(([x, y, alt], k, all) =>
      world(x, y, alt + base(k === all.length - 1 ? frac : a.leg.cum[k] / (a.leg.length || 1))).sub(origin).toArray());
    const done = !f ? 0 : a.index < f.legIndex ? 1 : a.index === f.legIndex ? f.progress : 0;
    setLine(a.planned, flat(1));
    a.done.visible = a.casing.visible = done > 0.002;
    if (a.done.visible) {
      const pts = flat(done);
      setLine(a.done, pts);
      setLine(a.casing, pts);
    }
    const lit = !f && a.index === selected;
    a.planned.material.color.set(lit ? HIGHLIGHT : a.planned.userData.color);
    for (const l of [a.planned, a.casing, a.done]) {
      l.material.resolution.set(gl.drawingBufferWidth, gl.drawingBufferHeight);
      l.material.linewidth = (lit && l === a.planned ? 6 : l.userData.width) * pr;
    }
  }
}
