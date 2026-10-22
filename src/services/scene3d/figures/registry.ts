import type * as THREE from 'three';
import type { ModelPose } from '../../../domain/types';
import { airBuilders } from './air';
import { bikeBuilders } from './bikes';
import { createModelFigure } from './glb';
import { groundBuilders } from './ground';
import { waterBuilders } from './water';

const all = { ...airBuilders, ...groundBuilders, ...bikeBuilders, ...waterBuilders };
const ORDER = ['airplane', 'helicopter', 'car', 'motorcycle', 'sportbike', 'bus', 'train', 'bicycle', 'ship', 'sailboat'];
const builders: Record<string, () => THREE.Group> = Object.fromEntries(ORDER.map((id) => [id, all[id]]));

export const FIGURE_IDS = Object.keys(builders);

/**
 * figure id → object; custom ids are `model:<url>`. A custom model that fails to load becomes `fallback` (the leg
 * mode's default: a car on the road, not an airplane) and `onError` hears why.
 */
export async function createFigure(id: string, pose?: ModelPose, fallback = 'airplane', onError?: (e: unknown) => void): Promise<THREE.Group> {
  if (id.startsWith('model:')) {
    try {
      return await createModelFigure(id.slice(6), pose);
    } catch (e) {
      console.warn('GLB failed', e);
      onError?.(e);
    }
  }
  return (builders[id] ?? builders[fallback] ?? builders.airplane)();
}
