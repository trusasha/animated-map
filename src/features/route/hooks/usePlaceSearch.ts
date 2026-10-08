import { useEffect, useMemo, useState } from 'react';
import type { Place } from '../../../domain/types';
import type { SearchItem } from '../../../ds';
import { api } from '../../../services/api';
import { placeSub } from './placeSub';

const DEBOUNCE_MS = 250;
const MAX_ITEMS = 6;

export function usePlaceSearch(onAdd: (place: Place) => void) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setPlaces([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      api.geocode(q, ctrl.signal)
        .then((found) => { setPlaces(found.slice(0, MAX_ITEMS)); setFailed(false); })
        .catch(() => { if (!ctrl.signal.aborted) { setPlaces([]); setFailed(true); } })
        .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const items = useMemo<SearchItem[]>(() => places.map((p, i) => ({ id: String(i), title: p.name, sub: placeSub(p) })), [places]);

  const select = (item: SearchItem) => {
    const place = places[Number(item.id)];
    if (!place) return;
    setQuery('');
    onAdd(place);
  };

  return { query, setQuery, items, loading, failed, select };
}
