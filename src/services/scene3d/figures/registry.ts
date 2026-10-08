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

export const FIGURE_LABELS: Record<string, string> = {
  airplane: 'Самолёт', helicopter: 'Вертолёт', car: 'Машина', motorcycle: 'Мотоцикл-эндуро',
  sportbike: 'Спортбайк', bus: 'Автобус', train: 'Поезд', bicycle: 'Велосипед', ship: 'Лайнер', sailboat: 'Парусник',
};

/** figure id → object; custom ids are `model:<url>` */
export async function createFigure(id: string, pose?: ModelPose): Promise<THREE.Group> {
  if (id.startsWith('model:')) {
    try {
      return await createModelFigure(id.slice(6), pose);
    } catch (e) { console.warn('GLB failed', e); }
  }
  return (builders[id] ?? builders.airplane)();
}
