import type { Map as MlMap, PointLike } from 'maplibre-gl';
import type { LngLat } from '../../domain/types';
import { HIT_LAYER } from './layers/editorLayers';

export interface PointerTarget {
  /** segment clicks and the hover cursor apply only while this holds */
  active(): boolean;
  segment(i: number): void;
  empty(): void;
}

/** routes map clicks to a pending pick, a segment of the hit layer, or empty map */
export function installPointer(map: MlMap, target: PointerTarget) {
  let pick: ((p: LngLat) => void) | null = null;
  const canvas = map.getCanvas();
  const hit = (point: PointLike) =>
    target.active() && map.getLayer(HIT_LAYER) ? map.queryRenderedFeatures(point, { layers: [HIT_LAYER] }) : [];

  map.on('click', (e) => {
    if (pick) {
      const cb = pick;
      pick = null;
      canvas.style.cursor = '';
      cb([e.lngLat.lng, e.lngLat.lat]);
      return;
    }
    if (!target.active()) return;
    const f = hit(e.point)[0];
    if (f) target.segment(f.properties.i as number);
    else target.empty();
  });
  map.on('mousemove', (e) => {
    if (pick || !target.active()) return;
    canvas.style.cursor = hit(e.point).length ? 'pointer' : '';
  });

  return {
    start(onPick: (p: LngLat) => void) {
      pick = onPick;
      canvas.style.cursor = 'crosshair';
      return () => {
        if (pick !== onPick) return;
        pick = null;
        canvas.style.cursor = '';
      };
    },
    cancel() {
      pick = null;
      canvas.style.cursor = '';
    },
  };
}
