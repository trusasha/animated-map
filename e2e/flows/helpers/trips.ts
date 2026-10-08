import type { APIRequestContext } from '@playwright/test';

export interface SeedStop { name: string; lng: number; lat: number; leg?: { mode: string; figure: string } }

export const PARIS: SeedStop = { name: 'Paris', lng: 2.3522, lat: 48.8566 };
export const BERLIN: SeedStop = { name: 'Berlin', lng: 13.405, lat: 52.52, leg: { mode: 'ground', figure: 'car' } };

export interface SeededTrip { id: string; title: string }

/** creates a trip through the API; callers delete it with `removeTrip` */
export async function seedTrip(
  request: APIRequestContext,
  opts: { title?: string; stops?: SeedStop[]; data?: Record<string, unknown> } = {},
): Promise<SeededTrip> {
  const title = opts.title ?? `Flow trip ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const stops = (opts.stops ?? [PARIS, BERLIN]).map((s, i) => ({ id: `s${i}`, ...s }));
  const res = await request.post('/api/trips', { data: { title, data: { stops, style: 'satellite', speed: 1, format: '9:16', ...opts.data } } });
  return { id: (await res.json()).id, title };
}

export const removeTrip = (request: APIRequestContext, id: string) => request.delete(`/api/trips/${id}`);
