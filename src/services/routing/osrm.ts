import { simplify } from '../../domain/geo';
import type { LngLat } from '../../domain/types';

export async function roadRoute(a: LngLat, b: LngLat): Promise<LngLat[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`;
  const json = await (await fetch(url)).json();
  const coords: LngLat[] | undefined = json.routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) throw new Error(json.message || 'no route');
  // rough the road so the figure doesn't twitch on every hairpin
  const tol = Math.max(0.0003, Math.hypot(b[0] - a[0], b[1] - a[1]) / 400);
  return [a, ...simplify(coords, tol), b];
}
