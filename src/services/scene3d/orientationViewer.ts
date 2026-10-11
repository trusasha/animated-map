import * as THREE from 'three';
import type { Vec3 } from '../../domain/orientation';
import type { ModelPose } from '../../domain/types';
import { animateFigure } from './figures/animate';
import { applyModelPose, createModelFigure } from './figures/glb';
import { createStage } from './stage';

export interface OrientationViewer {
  setPose(pose: ModelPose): void;
  dispose(): void;
}

export interface OrientationViewerOptions {
  /** CSS colors of the travel arrow and the ground grid */
  colors: { travel: string; grid: string };
  /** a left-drag (one finger on touch) asks to turn the figure by `deg` around `axis` of the figure frame */
  onRotate(axis: Vec3, deg: number): void;
}

const VIEW = new THREE.Vector3(-1.4, 0.8, 0.55).normalize();

/** flat arrow on the ground along +Z, the way the figure travels in the video */
function travelArrow(color: string) {
  const s = new THREE.Shape();
  s.moveTo(-0.03, -1.0).lineTo(0.03, -1.0).lineTo(0.03, 0.85).lineTo(0.11, 0.85).lineTo(0, 1.12).lineTo(-0.11, 0.85).lineTo(-0.03, 0.85).closePath();
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), side: THREE.DoubleSide }));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = 0.004;
  return mesh;
}

function groundGrid(color: string) {
  const grid = new THREE.GridHelper(2.4, 12, new THREE.Color(color), new THREE.Color(color));
  const material = grid.material as THREE.Material;
  material.transparent = true;
  material.opacity = 0.35;
  return grid;
}

/** The figure on a ground grid with its direction of travel; left-drag turns the figure, right-drag or two fingers orbit the camera */
export function mountOrientationViewer(el: HTMLElement, url: string, pose: ModelPose, opts: OrientationViewerOptions): OrientationViewer {
  const stage = createStage(el, 'orientation-viewer-canvas');
  const { scene, camera, controls, renderer } = stage;
  controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
  scene.add(groundGrid(opts.colors.grid), travelArrow(opts.colors.travel));

  const size = pose.scale;
  const dist = (0.8 * size) / Math.sin((camera.fov * Math.PI) / 360);
  controls.target.set(0, 0.25 * size, 0);
  controls.minDistance = dist * 0.4;
  controls.maxDistance = dist * 3;
  camera.position.copy(VIEW).multiplyScalar(dist).add(controls.target);
  controls.update();

  let latest = pose;
  let figure: THREE.Group | undefined;
  let disposed = false;
  createModelFigure(url, pose).then((fig) => {
    if (disposed) return;
    applyModelPose(fig, latest);
    animateFigure(fig, 0.3);
    scene.add(fig);
    figure = fig;
  }).catch(() => {});

  const canvas = renderer.domElement;
  const pointers = new Map<number, { x: number; y: number }>();
  const right = new THREE.Vector3(), up = new THREE.Vector3(), axis = new THREE.Vector3();
  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  };
  const move = (e: PointerEvent) => {
    const last = pointers.get(e.pointerId);
    if (!last) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size !== 1) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    if (!dx && !dy) return;
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    axis.copy(up).multiplyScalar(dx).addScaledVector(right, dy).normalize();
    opts.onRotate([axis.x, axis.y, axis.z], (Math.hypot(dx, dy) * 180) / Math.max(el.clientHeight, 1));
  };
  const release = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (!pointers.size) canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  return {
    setPose(p) {
      latest = p;
      if (figure) applyModelPose(figure, p);
    },
    dispose() {
      disposed = true;
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', release);
      canvas.removeEventListener('pointercancel', release);
      stage.dispose();
    },
  };
}
