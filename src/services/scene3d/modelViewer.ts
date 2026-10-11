import * as THREE from 'three';
import { animateFigure } from './figures/animate';
import { createFigure } from './figures/registry';
import { createStage } from './stage';
import type { ModelPose } from '../../domain/types';

export interface ModelViewer {
  setPose(pose?: ModelPose): void;
  dispose(): void;
}

const VIEW = new THREE.Vector3(-1.25, 1.05, 1.15).normalize();

/** Interactive orbit view of a figure inside `el`: drag to rotate, wheel or pinch to zoom */
export function mountModelViewer(el: HTMLElement, figureId: string, pose?: ModelPose): ModelViewer {
  const { scene, camera, controls, dispose } = createStage(el, 'figure-viewer-canvas');

  let figure: THREE.Object3D | undefined;
  let disposed = false;
  let token = 0;

  const load = (p?: ModelPose) => {
    const mine = ++token;
    createFigure(figureId, p).then((fig) => {
      if (disposed || mine !== token) return;
      if (figure) scene.remove(figure);
      animateFigure(fig, 0.3);
      scene.add(fig);
      const sphere = new THREE.Box3().setFromObject(fig).getBoundingSphere(new THREE.Sphere());
      const first = !figure;
      figure = fig;
      const dist = (1.15 * sphere.radius) / Math.sin((camera.fov * Math.PI) / 360);
      controls.target.copy(sphere.center);
      controls.minDistance = dist * 0.4;
      controls.maxDistance = dist * 3;
      if (first) camera.position.copy(VIEW).multiplyScalar(dist).add(sphere.center);
      controls.update();
    }).catch(() => {});
  };
  load(pose);

  return {
    setPose: load,
    dispose() {
      disposed = true;
      dispose();
    },
  };
}
