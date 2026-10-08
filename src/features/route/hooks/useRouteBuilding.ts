import { useEffect } from 'react';
import { legMeta } from '../../../domain/legs';
import { legsOf, pathKey } from '../../../domain/route';
import type { TripData } from '../../../domain/types';
import { buildPath } from '../../../services/routing';
import { reportError } from '../../toasts';

/** fills in the geometry of legs whose path is missing or belongs to other stops; Preview and Export wait meanwhile */
export function useRouteBuilding(data: TripData | undefined, update: (fn: (d: TripData) => TripData) => void, setRouting: (routing: boolean) => void) {
  const stops = data?.stops;
  useEffect(() => {
    if (!data || !stops) return;
    const legs = stops.length > 1 ? legsOf(data) : [];
    const stale = legs.map((_, i) => i).filter((i) => legMeta(data, i).building);
    if (!stale.length) {
      setRouting(false);
      return;
    }
    setRouting(true);
    let cancelled = false;
    const keys = stale.map((i) => pathKey(data, i));
    Promise.all(stale.map((i) => buildPath([stops[i].lng, stops[i].lat], [stops[i + 1].lng, stops[i + 1].lat], legs[i].mode)))
      .then((paths) => {
        if (cancelled) return;
        update((d) => ({
          ...d,
          stops: d.stops.map((s, i) => {
            const k = i > 0 ? keys.indexOf(pathKey(d, i - 1)) : -1;
            return k >= 0 ? { ...s, leg: { ...s.leg!, path: paths[k], pathKey: keys[k] } } : s;
          }),
        }));
      })
      .catch((e) => {
        if (cancelled) return;
        setRouting(false);
        reportError(e);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- legs live on the stops: a new stops array is the only trigger
  }, [stops]);

  useEffect(() => () => setRouting(false), [setRouting]);
}
