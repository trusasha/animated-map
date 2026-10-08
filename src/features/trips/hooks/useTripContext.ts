import { createContext, useContext } from 'react';
import type { TripContextValue } from '../types';

export const TripContext = createContext<TripContextValue>({
  trip: null,
  loading: false,
  update: () => {},
  setTitle: () => {},
  discard: () => {},
  saveStatus: 'idle',
  routing: false,
  setRouting: () => {},
});

export const useTripContext = () => useContext(TripContext);
