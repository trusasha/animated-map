import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveFigures } from '../../../domain/figures';
import { chain } from '../../../domain/route';
import { normalizeTrip } from '../../../domain/trips';
import type { Trip, TripData } from '../../../domain/types';
import { api } from '../../../services/api';
import { useSettings } from '../../settings';
import { reportError } from '../../toasts';
import type { SaveStatus, TripContextValue } from '../types';

const SAVE_DEBOUNCE_MS = 700;

export function useTripController(tripId: string | null): TripContextValue {
  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(tripId !== null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [routing, setRouting] = useState(false);

  const latest = useRef<Trip | null>(null);
  const dirty = useRef(false);
  const savedTitle = useRef('');
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
    const sent = latest.current;
    if (!dirty.current || !sent) return;
    dirty.current = false;
    setSaveStatus('saving');
    const save = api.saveTrip(sent).then(() => {
      if (sent.title !== savedTitle.current) api.log('trip.rename', { trip: sent.id, title: sent.title });
      savedTitle.current = sent.title;
      if (!dirty.current) setSaveStatus('saved');
    }).catch((e) => {
      dirty.current = true;
      setSaveStatus('error');
      reportError(e);
    }).finally(() => { inFlight.current = null; });
    inFlight.current = save;
    await save;
  }, []);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    Promise.all([api.trip(tripId), api.models().catch(() => null)]).then(([stored, models]) => {
      if (cancelled) return;
      const normalized = normalizeTrip(stored, settingsRef.current);
      const loaded = models ? { ...normalized, data: resolveFigures(normalized.data, models, settingsRef.current) } : normalized;
      latest.current = loaded;
      savedTitle.current = loaded.title;
      setTrip(loaded);
    }).catch(reportError).finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      void flush();
    };
  }, [tripId, flush]);

  useEffect(() => {
    const onHide = () => { void flush(); };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [flush]);

  const edit = useCallback((next: Trip) => {
    latest.current = next;
    dirty.current = true;
    setTrip(next);
    setSaveStatus('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush(); }, SAVE_DEBOUNCE_MS);
  }, [flush]);

  const update = useCallback((fn: (d: TripData) => TripData) => {
    const t = latest.current;
    if (t) edit({ ...t, data: chain(fn(t.data), settingsRef.current) });
  }, [edit]);

  const setTitle = useCallback((title: string) => {
    const t = latest.current;
    if (t && t.title !== title) edit({ ...t, title });
  }, [edit]);

  const discard = useCallback(() => {
    window.clearTimeout(timer.current);
    dirty.current = false;
  }, []);

  return { trip, loading, update, setTitle, discard, saveStatus, routing, setRouting };
}
