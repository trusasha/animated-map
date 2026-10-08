import type { LngLat, Trip, TripData, TripSummary } from '../../domain/types';
import { jsonBody, req } from './http';

/** lightweight row for the trips list (no paths, no full data) */
export interface TripListItem {
  id: string;
  title: string;
  updated_at: string;
  summary: TripSummary;
  points: LngLat[];
}

export const trips = {
  trips: () => req<TripListItem[]>('/api/trips'),
  trip: (id: string) => req<Trip>(`/api/trips/${id}`),
  createTrip: (title: string, data: TripData) => req<Trip>('/api/trips', jsonBody('POST', { title, data })),
  saveTrip: (t: Trip) => req<Trip>(`/api/trips/${t.id}`, jsonBody('PUT', { title: t.title, data: t.data })),
  deleteTrip: (id: string) => req(`/api/trips/${id}`, { method: 'DELETE' }),
};
