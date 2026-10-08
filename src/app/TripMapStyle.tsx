import { useEffect } from 'react';
import { useTripContext } from '../features/trips';
import type { MapService } from '../services/map';
import { reportError } from '../features/toasts';

/** the shared map shows the open trip's style */
export function TripMapStyle({ map }: { map: MapService }) {
  const style = useTripContext().trip?.data.style;
  useEffect(() => {
    if (style) map.setStyle(style).catch(reportError);
  }, [map, style]);
  return null;
}
