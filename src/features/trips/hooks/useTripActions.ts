import { useCallback, useState } from 'react';
import type { TripData } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import { api } from '../../../services/api';
import { reportError } from '../../toasts';

const EMPTY: TripData = { stops: [], style: 'satellite', speed: 1, format: '9:16' };

export interface TripActions {
  busy: boolean;
  /** creates an empty trip (keeping `base` style and format) and resolves with its id; null when it failed */
  create: (base?: Pick<TripData, 'style' | 'format'>) => Promise<string | null>;
  rename: (id: string, title: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

export function useTripActions(): TripActions {
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  const run = useCallback(async <R,>(job: () => Promise<R>, fallback: R) => {
    setBusy(true);
    try {
      return await job();
    } catch (e) {
      reportError(e);
      return fallback;
    } finally {
      setBusy(false);
    }
  }, []);

  const create = useCallback((base?: Pick<TripData, 'style' | 'format'>) => run(async () => {
    const created = await api.createTrip(t('trips.defaultName'), { ...EMPTY, ...base });
    api.log('trip.create', { trip: created.id });
    return created.id;
  }, null), [run, t]);

  const rename = useCallback((id: string, title: string) => run(async () => {
    await api.saveTrip({ ...(await api.trip(id)), title });
    api.log('trip.rename', { trip: id, title });
    return true;
  }, false), [run]);

  const remove = useCallback((id: string) => run(async () => {
    await api.deleteTrip(id);
    api.log('trip.delete', { trip: id });
    return true;
  }, false), [run]);

  return { busy, create, rename, remove };
}
