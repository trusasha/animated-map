import { useEffect, useRef, useState } from 'react';
import { chain } from '../../../domain/route';
import { isDefaultTripName, rangeWasReset, suggestTripName } from '../../../domain/trips';
import type { ParsedTrip, Trip } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import { api } from '../../../services/api';
import { useSettings } from '../../settings';
import { useToasts } from '../../toasts';
import type { ComposerTripApi } from '../types';

/** the parsed route replaces the stops and drops the video range; the title changes only while it is still a default one */
const applyPlan = (t: Trip, plan: ParsedTrip, ids: string[], settings: Parameters<typeof chain>[1]): Trip => {
  const stops = plan.stops.map((s, i) => ({ ...s, id: ids[i] }));
  const title = isDefaultTripName(t.title) ? plan.title || suggestTripName(stops) || t.title : t.title;
  return { ...t, title, data: chain({ ...t.data, range: undefined, stops }, settings) };
};

export function useAiParse({ trip, update }: ComposerTripApi) {
  const { t } = useT();
  const { settings } = useSettings();
  const { push } = useToasts();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const latest = useRef({ trip, update, settings, t, push });
  useEffect(() => { latest.current = { trip, update, settings, t, push }; });

  useEffect(() => {
    let alive = true;
    api.config().then((c) => alive && setEnabled(c.openai), () => alive && setEnabled(false));
    return () => { alive = false; };
  }, []);

  /** true when the route was replaced */
  const parse = async (text: string): Promise<boolean> => {
    const id = latest.current.trip.id;
    setBusy(true);
    try {
      const plan = await api.parse(text);
      if (!plan.stops?.length) throw new Error('no stops');
      const now = latest.current;
      if (now.trip.id !== id) return false;
      const ids = plan.stops.map(() => crypto.randomUUID());
      const after = applyPlan(now.trip, plan, ids, now.settings);
      const name = after.title === now.trip.title ? plan.title || suggestTripName(after.data.stops) || after.title : after.title;
      const routeReplaced = now.t('toasts.routeReplaced', { count: after.data.stops.length, name });
      now.update((cur) => (cur.id === id ? applyPlan(cur, plan, ids, now.settings) : cur));
      now.push({ tone: 'info', message: rangeWasReset(now.trip.data, after.data) ? `${routeReplaced} ${now.t('toasts.rangeReset')}` : routeReplaced });
      api.log('composer.parse', { ok: true, chars: text.length, stops: after.data.stops.length, approx: after.data.stops.filter((s) => s.approx).length, renamed: after.title !== now.trip.title });
      return true;
    } catch (e) {
      latest.current.push({ tone: 'error', message: latest.current.t('toasts.routeNotFound') });
      api.log('composer.parse', { ok: false, chars: text.length, error: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { enabled, busy, parse };
}
