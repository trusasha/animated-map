import type { ParsedTrip, Place } from '../../domain/types';
import { jsonBody, req } from './http';

export const ai = {
  reverse: (lng: number, lat: number) => req<Place | null>(`/api/reverse?lng=${lng}&lat=${lat}`),
  geocode: (q: string, signal?: AbortSignal) => req<Place[]>(`/api/geocode?q=${encodeURIComponent(q)}`, { signal }),
  voice: (audio: Blob) => req<{ text: string }>('/api/voice', { method: 'POST', headers: { 'Content-Type': audio.type || 'audio/webm' }, body: audio }),
  parse: (text: string) => req<ParsedTrip>('/api/parse', jsonBody('POST', { text })),
};
