import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { animateFigure } from './figures/animate';
import { createFigure } from './figures/registry';
import type { ModelPose } from '../../domain/types';

export interface ModelViewer {
  setPose(pose?: ModelPose): void;
  dispose(): void;
}

const VIEW = new THREE.Vector3(-1.25, 1.05, 1.15).normalize();

/** Interactive orbit view of a figure inside `el`: drag to rotate, wheel or pinch to zoom */
export function mountModelViewer(el: HTMLElement, figureId: string, pose?: ModelPose): ModelViewer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
  renderer.domElement.dataset.testid = 'figure-viewer-canvas';
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(0.6, 1, -0.4);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;

  let figure: THREE.Object3D | undefined;
  let disposed = false;
  let frame = 0;
  let token = 0;

  const resize = () => {
    const w = Math.max(el.clientWidth, 1);
    const h = Math.max(el.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(el);
  resize();

  const loop = () => {
    frame = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  };
  loop();

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
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
