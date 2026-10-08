import type { ReactNode } from 'react';

export interface HomeScreenProps { onOpenTrip: (id: string) => void }

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
