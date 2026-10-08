import type { CustomModel, Mode, ParsedTrip, Place, Trip, TripData } from './types';

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `${res.status} ${res.statusText}`);
  return json;
}

const jsonBody = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  config: () => req<{ openai: boolean; photo3d: boolean }>('/api/config'),
  trips: () => req<Trip[]>('/api/trips'),
  trip: (id: string) => req<Trip>(`/api/trips/${id}`),
  createTrip: (title: string, data: TripData) => req<Trip>('/api/trips', jsonBody('POST', { title, data })),
  saveTrip: (t: Trip) => req<Trip>(`/api/trips/${t.id}`, jsonBody('PUT', { title: t.title, data: t.data })),
  deleteTrip: (id: string) => req(`/api/trips/${id}`, { method: 'DELETE' }),
  /** fire-and-forget action log (data/logs/actions.jsonl) */
  log: (type: string, data: object = {}) => { fetch('/api/log', { ...jsonBody('POST', { type, data }), keepalive: true }).catch(() => {}); },
  reverse: (lng: number, lat: number) => req<Place | null>(`/api/reverse?lng=${lng}&lat=${lat}`),
  geocode: (q: string, signal?: AbortSignal) => req<Place[]>(`/api/geocode?q=${encodeURIComponent(q)}`, { signal }),
  voice: (audio: Blob) => req<{ text: string }>('/api/voice', { method: 'POST', headers: { 'Content-Type': audio.type || 'audio/webm' }, body: audio }),
  parse: (text: string) => req<ParsedTrip>('/api/parse', jsonBody('POST', { text })),
  models: () => req<CustomModel[]>('/api/models'),
  addModel: (file: File, name: string, mode: Mode | null) => {
    const glb = /\.glb$/i.test(file.name);
    const q = new URLSearchParams({ name, file: file.name, ...(mode && { mode }) });
    const type = glb ? 'model/gltf-binary' : file.type || 'image/jpeg';
    return req<CustomModel>(`/api/models/${glb ? 'upload' : 'generate'}?${q}`, { method: 'POST', headers: { 'Content-Type': type }, body: file });
  },
  editModel: (m: CustomModel) => req<CustomModel>(`/api/models/${m.id}`, jsonBody('PUT', { name: m.name, mode: m.mode, pose: m.pose })),
  refreshModel: (id: string) => req<CustomModel>(`/api/models/${id}/refresh`, { method: 'POST' }),
  deleteModel: (id: string) => req(`/api/models/${id}`, { method: 'DELETE' }),
};
