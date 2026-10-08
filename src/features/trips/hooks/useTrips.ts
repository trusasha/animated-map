import { useCallback, useEffect, useState } from 'react';
import { api, type TripListItem } from '../../../services/api';

export interface TripsList {
  /** null until the first response */
  trips: TripListItem[] | null;
  failed: boolean;
  reload: () => void;
}

const newestFirst = (a: TripListItem, b: TripListItem) => b.updated_at.localeCompare(a.updated_at);

export function useTrips(): TripsList {
  const [trips, setTrips] = useState<TripListItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.trips().then((list) => {
      if (cancelled) return;
      setTrips([...list].sort(newestFirst));
      setFailed(false);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { trips, failed, reload };
}
