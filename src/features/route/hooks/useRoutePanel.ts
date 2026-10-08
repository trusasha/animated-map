import { useState } from 'react';
import { legMeta, segColor } from '../../../domain/legs';
import { legsOf } from '../../../domain/route';
import { span } from '../../../domain/trips';
import type { Trip } from '../../../domain/types';
import { useViewportMode } from '../../../ds';
import { useT } from '../../../i18n/react';
import { useSettings } from '../../settings';
import { useTripContext } from '../../trips';
import type { RoutePanelProps } from '../types';
import { useEditorMapBinding } from './useEditorMapBinding';
import { usePick } from './usePick';
import { usePlaceSearch } from './usePlaceSearch';
import { usePoseModels } from './usePoseModels';
import { useRouteBuilding } from './useRouteBuilding';
import { useRouteEditing } from './useRouteEditing';

/** everything the route panel shows and does for the open trip */
export function useRoutePanel({ selected, onSelect, onPickChange, map }: RoutePanelProps, trip: Trip) {
  const { t } = useT();
  const { settings } = useSettings();
  const { coarse } = useViewportMode();
  const { update, setTitle, setRouting } = useTripContext();
  const { data } = trip;
  const { models, poseKey } = usePoseModels();
  const [composerOpen, setComposerOpen] = useState(false);

  useRouteBuilding(data, update, setRouting);
  const editing = useRouteEditing({ data, update, onSelect });
  const pick = usePick(map, data.stops, onPickChange, editing.moveTo);
  const search = usePlaceSearch(editing.add);
  useEditorMapBinding({
    map, data, selected, pickingId: pick.pickingId, onSelect, poseKey,
    onStopDrag: (i, p) => editing.moveTo(data.stops[i].id, p),
  });

  const [s0, s1] = span(data);
  const legs = data.stops.length > 1 ? legsOf(data) : [];
  const figureName = (id: string) =>
    id.startsWith('model:') ? models.find((m) => `model:${m.url}` === id)?.name ?? id : t(`figures.names.${id}` as 'figures.names.car');

  const segments = legs.map((leg, i) => ({
    ...legMeta(data, i), mode: leg.mode, figure: figureName(leg.figure), color: segColor(leg, settings),
    outOfRange: i < s0 || i >= s1, selected: selected === i,
  }));
  const picking = data.stops.find((s) => s.id === pick.pickingId);

  const remove = (i: number) => { pick.stop(); editing.remove(i); };

  return {
    stops: data.stops, segments, search, pick, touch: coarse, picking,
    range: data.range ? { from: s0, to: s1 } : null,
    span: { from: s0, to: s1 },
    composer: { open: composerOpen, toggle: () => setComposerOpen((o) => !o), close: () => { setComposerOpen(false); onSelect(null); } },
    composerTrip: {
      trip,
      update: (fn: (t: Trip) => Trip) => {
        const next = fn(trip);
        if (next.title !== trip.title) setTitle(next.title);
        update(() => next.data);
      },
    },
    editing: { ...editing, remove },
    selectedEndpoint: (k: number) => selected !== null && (k === selected || k === selected + 1),
  };
}
