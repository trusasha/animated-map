import { useEffect } from 'react';
import type { MapService } from '../../../services/map';
import { reportError } from '../../toasts';
import { useTripContext } from '../../trips';

/** the shared map shows the open trip's style */
export function useTripMapStyle(map: MapService) {
  const style = useTripContext().trip?.data.style;
  useEffect(() => {
    if (style) map.setStyle(style).catch(reportError);
  }, [map, style]);
}
