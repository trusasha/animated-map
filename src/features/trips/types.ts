import type { ReactNode } from 'react';
import type { LngLat, Trip, TripData } from '../../domain/types';

/** what Home needs from the shared map; the composition root passes the map service in */
export interface HomeGlobe {
  setHomeTrips: (trips: { id: string; points: LngLat[] }[]) => void;
  highlightTrip: (id: string | null) => void;
  setSpin: (on: boolean) => void;
  setPadding: (p: { top: number; bottom: number; left: number; right: number }) => void;
  /** padding that also sizes the globe to the free area */
  setHomePadding: (p: { top: number; bottom: number; left: number; right: number }) => void;
}

export interface HomeScreenProps { onOpenTrip: (id: string) => void; globe?: HomeGlobe }

export interface AppHeaderProps {
  /** null on Home */
  tripId: string | null;
  onGoHome: () => void;
  onOpenTrip: (id: string) => void;
  onPreview: () => void;
  onExport: () => void;
  onOpenSettings: () => void;
  onOpenFigures: () => void;
}

/** loads and autosaves the trip for `tripId`, exposes it to the features below; null = Home */
export interface TripProviderProps { tripId: string | null; children: ReactNode }

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface TripContextValue {
  /** null on Home and while loading */
  trip: Trip | null;
  loading: boolean;
  /** applies at once (legs re-chained), saved after a short pause */
  update: (fn: (d: TripData) => TripData) => void;
  setTitle: (title: string) => void;
  /** drops unsaved edits, e.g. before the trip is deleted */
  discard: () => void;
  saveStatus: SaveStatus;
  /** a route is being built: Preview and Export wait */
  routing: boolean;
  setRouting: (routing: boolean) => void;
}
