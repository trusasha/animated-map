import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { animateFigure, createFigure, figureKey } from './figures';
import type { ModelPose } from './types';

const SIZE = 192;
let stage: { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } | undefined;
const cache = new Map<string, Promise<string>>();
const VIEW = new THREE.Vector3(-1.25, 1.05, 1.15).normalize();

function setup() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(0.6, 1, -0.4);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
  return { renderer, scene, camera };
}

/** PNG data URL of a figure seen from a 3/4 view; cached per figure id and pose */
export function figureThumb(id: string, pose?: ModelPose) {
  const key = figureKey(id, pose);
  if (!cache.has(key)) cache.set(key, createFigure(id, pose).then((fig) => {
    stage ??= setup();
    const { renderer, scene, camera } = stage;
    animateFigure(fig, 0.3);
    const sphere = new THREE.Box3().setFromObject(fig).getBoundingSphere(new THREE.Sphere());
    const dist = (0.72 * sphere.radius) / Math.sin((camera.fov * Math.PI) / 360);
    camera.position.copy(VIEW).multiplyScalar(dist).add(sphere.center);
    camera.lookAt(sphere.center);
    scene.add(fig);
    renderer.render(scene, camera);
    scene.remove(fig);
    return renderer.domElement.toDataURL('image/png');
  }));
  return cache.get(key)!;
}
