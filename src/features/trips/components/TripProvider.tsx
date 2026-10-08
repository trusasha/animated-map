import { TripContext } from '../hooks/useTripContext';
import { useTripController } from '../hooks/useTrip';
import type { TripProviderProps } from '../types';

export function TripProvider({ tripId, children }: TripProviderProps) {
  return <TripContext value={useTripController(tripId)}>{children}</TripContext>;
}
