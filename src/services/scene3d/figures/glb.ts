import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CustomModel, ModelPose } from '../../../domain/types';
import { group } from './materials';

const DEG = Math.PI / 180;
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


/** re-poses a figure made by createModelFigure in place */
export function applyModelPose(g: THREE.Object3D, pose: ModelPose) {
  const inner = g.children[0];
  inner.rotation.set(pose.rx * DEG, pose.ry * DEG, pose.rz * DEG, 'YXZ');
  normalize(inner);
  inner.scale.multiplyScalar(pose.scale);
  inner.position.multiplyScalar(pose.scale);
}

/** custom `model:<url>` figure with its pose applied; rejects when the GLB fails to load */
export async function createModelFigure(url: string, pose?: ModelPose) {
  const g = await loadGlb(url);
  pose ??= poses.get(url);
  if (pose) applyModelPose(g, pose);
  return g;
}
