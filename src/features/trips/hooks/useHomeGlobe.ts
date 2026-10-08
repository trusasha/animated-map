import { useCallback, useEffect } from 'react';
import type { TripListItem } from '../../../services/api';
import type { HomeGlobe } from '../types';

/** draws the saved trips on the Home globe; `hover` eases to a trip and pauses the spin */
export function useHomeGlobe(globe: HomeGlobe | undefined, trips: TripListItem[] | null) {
  useEffect(() => {
    if (!globe || !trips) return;
    globe.setHomeTrips(trips.map(({ id, points }) => ({ id, points })));
  }, [globe, trips]);

  useEffect(() => () => {
    globe?.highlightTrip(null);
    globe?.setSpin(true);
  }, [globe]);

  return useCallback((id: string | null) => {
    globe?.highlightTrip(id);
    globe?.setSpin(id === null);
  }, [globe]);
}
