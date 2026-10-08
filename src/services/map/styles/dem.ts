import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { clampBathymetry } from '../../../domain/dem';

let registered = false;

/** `dem://` = the https tile with bathymetry flattened (see domain/dem) */
export function registerDemProtocol() {
  if (registered) return;
  registered = true;
  // the production bundle doesn't emit maplibre's default sibling worker file
  if (import.meta.env.PROD) maplibregl.setWorkerUrl(workerUrl);
  maplibregl.addProtocol('dem', async ({ url }, ctrl) => {
    const res = await fetch(url.replace('dem://', 'https://'), { signal: ctrl.signal });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0);
    const img = ctx.getImageData(0, 0, bmp.width, bmp.height);
    clampBathymetry(img.data);
    return { data: await createImageBitmap(img) };
  });
}
