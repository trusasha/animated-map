import { useTripMapStyle } from '../features/editor';
import type { MapService } from '../services/map';

/** runs the style binding inside the trip provider */
export function TripMapStyle({ map }: { map: MapService }) {
  useTripMapStyle(map);
  return null;
}
