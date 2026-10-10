import { moveStop, moveStopTo, rangeWasReset, removeStop } from '../../../domain/trips';
import type { LngLat, Place, Stop, TripData } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import { api } from '../../../services/api';
import { useSettings } from '../../settings';
import { useToasts } from '../../toasts';
import { placeSub } from './placeSub';

export interface RouteEditingArgs {
  data: TripData;
  update: (fn: (d: TripData) => TripData) => void;
  /** stop indices shift on removal: the host drops its segment selection */
  onSelect: (index: number | null) => void;
}

export function useRouteEditing({ data, update, onSelect }: RouteEditingArgs) {
  const { t } = useT();
  const { settings } = useSettings();
  const { push } = useToasts();
  const last = data.stops.length - 1;

  const resetNote = (after: TripData) => (rangeWasReset(data, after) ? ` ${t('toasts.rangeReset')}` : '');

  const add = (place: Place) => {
    const stop: Stop = { id: crypto.randomUUID(), name: place.name, lng: place.lng, lat: place.lat, sub: placeSub(place) };
    api.log('stop.add', { name: place.name, lng: place.lng, lat: place.lat });
    update((d) => ({ ...d, stops: [...d.stops, stop] }));
  };

  const remove = (i: number) => {
    const before = data, name = data.stops[i].name;
    const after = removeStop(before, i, settings);
    api.log('stop.remove', { index: i, name });
    onSelect(null);
    update((d) => removeStop(d, i, settings));
    push({
      tone: 'info',
      message: `${t('route.stopRemoved', { name })}${resetNote(after)}`,
      action: { label: t('common.actions.undo'), onAction: () => { api.log('stop.restore', { index: i, name }); update(() => before); } },
    });
  };

  const move = (from: number, to: number) => {
    const after = moveStop(data, from, to, settings);
    api.log('stop.reorder', { from, to, name: data.stops[from].name });
    update((d) => moveStop(d, from, to, settings));
    if (rangeWasReset(data, after)) push({ tone: 'info', message: t('toasts.rangeReset') });
  };

  /** the stop takes the new place, then its name and region follow the reverse geocode */
  const moveTo = (id: string, p: LngLat) => {
    const i = data.stops.findIndex((s) => s.id === id);
    if (i < 0) return;
    const old = data.stops[i];
    api.log('stop.move', { index: i, name: old.name, from: [old.lng, old.lat], to: p });
    update((d) => moveStopTo(d, d.stops.findIndex((s) => s.id === id), p));
    const keep = () => push({ tone: 'error', message: t('toasts.geocodeFailed', { name: old.name }) });
    api.reverse(p[0], p[1]).then((place) => {
      if (!place?.name) return keep();
      update((d) => ({
        ...d,
        stops: d.stops.map((s) => (s.id === id && s.lng === p[0] && s.lat === p[1] ? { ...s, name: place.name, sub: placeSub(place) } : s)),
      }));
    }).catch(keep);
  };

  const setRange = (from: number, to: number) => {
    api.log('range.set', { from, to, whole: from === 0 && to === last });
    update((d) => ({ ...d, range: from === 0 && to === d.stops.length - 1 ? undefined : { from: d.stops[from].id, to: d.stops[to].id } }));
  };

  const clearRange = () => {
    api.log('range.set', { whole: true });
    update((d) => ({ ...d, range: undefined }));
  };

  return { add, remove, move, moveTo, setRange, clearRange };
}
