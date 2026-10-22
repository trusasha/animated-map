import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CustomModel, ModelPose } from '../../../domain/types';
import { group } from './materials';

const DEG = Math.PI / 180;
/** longest texture side kept: a figure is ~100 px on screen, photo→3D models ship 4096² (~90 MB of GPU memory per map) */
const MAX_TEXTURE = 1024;
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

/** draws every oversized texture image into a MAX_TEXTURE canvas once, before anything uploads it to the GPU */
function shrinkTextures(root: THREE.Object3D) {
  const done = new Set<THREE.Texture>();
  root.traverse((o) => {
    const mats = (o as THREE.Mesh).material;
    for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
      for (const v of Object.values(m)) {
        if (!(v instanceof THREE.Texture) || done.has(v)) continue;
        done.add(v);
        const img = v.image as { width: number; height: number; close?: () => void } | undefined;
        const side = Math.max(img?.width ?? 0, img?.height ?? 0);
        if (!img || side <= MAX_TEXTURE) continue;
        const k = MAX_TEXTURE / side, canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * k);
        canvas.height = Math.round(img.height * k);
        canvas.getContext('2d')!.drawImage(img as CanvasImageSource, 0, 0, canvas.width, canvas.height);
        img.close?.();
        v.image = canvas;
        v.needsUpdate = true;
      }
    }
  });
}

/** Normalizes any GLB into the figure convention: Y up, longest horizontal side along Z, ~1 unit long. */
function loadGlb(url: string) {
  if (!glbCache.has(url)) {
    glbCache.set(url, loader.loadAsync(url).then((gltf) => {
      const root = gltf.scene;
      shrinkTextures(root);
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
