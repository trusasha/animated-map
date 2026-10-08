import { greatCircle, unwrap } from '../../domain/geo';
import type { LngLat, Mode } from '../../domain/types';
import { roadRoute } from './osrm';

export async function buildPath(a: LngLat, b: LngLat, mode: Mode): Promise<LngLat[]> {
  if (mode === 'ground') {
    try { return unwrap(await roadRoute(a, b)); } catch (e) { console.warn('road route failed, straight line', e); }
  }
  return greatCircle(a, b);
}
