import type { Map as MlMap } from 'maplibre-gl';
import type { Bounds, FitFn, Frame } from '../../domain/timeline';
import type { LngLat } from '../../domain/types';

const wrapLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

export function mercatorFit(w: number, h: number, b: Bounds) {
  const my = (lat: number) => (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * Math.PI) / 360))) / 360;
  const x0 = (b[0] + 180) / 360, x1 = (b[2] + 180) / 360, y0 = my(b[3]), y1 = my(b[1]);
  const pad = 0.14;
  const zoom = Math.log2(Math.min((w * (1 - 2 * pad)) / (Math.max(x1 - x0, 1e-7) * 512), (h * (1 - 2 * pad)) / (Math.max(y1 - y0, 1e-7) * 512)));
  const cy = (y0 + y1) / 2;
  const lat = (360 / Math.PI) * Math.atan(Math.exp(((180 - cy * 360) * Math.PI) / 180)) - 90;
  return { zoom, center: [(b[0] + b[2]) / 2, lat] as LngLat };
}

/** fits the map container, never the UI padding: preview and export must frame alike */
export const containerFit = (map: MlMap): FitFn => (b) => {
  const c = map.getContainer();
  return mercatorFit(c.clientWidth, c.clientHeight, b);
};

export function jumpToCamera(map: MlMap, c: Frame['camera']) {
  map.jumpTo({ center: [wrapLng(c.center[0]), c.center[1]], zoom: c.zoom, pitch: c.pitch, bearing: 0 });
}
