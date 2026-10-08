import { useState } from 'react';
import { applyColorToAll, changeMode, legMeta, resetColor, segColor } from '../../domain/legs';
import { setLegAt } from '../../domain/route';
import type { Leg, Mode } from '../../domain/types';
import { useT } from '../../i18n/react';
import { api } from '../../services/api';
import { useModels } from '../figures';
import { useSettings } from '../settings';
import { useToasts } from '../toasts';
import { useTripContext } from '../trips';

/** the selected segment (leg `index`, between stops index and index+1) and every edit the inspector makes to it */
export function useInspector(index: number) {
  const { t } = useT();
  const { trip, update } = useTripContext();
  const { settings } = useSettings();
  const { models } = useModels();
  const { push } = useToasts();
  const [held, setDraft] = useState<{ index: number; speed?: number; smooth?: number }>({ index });
  const draft: { speed?: number; smooth?: number } = held.index === index ? held : {};

  const stops = trip?.data.stops ?? [];
  const leg = stops[index + 1]?.leg;
  if (!trip || !leg) return null;

  const patch = (fn: (l: Leg) => Leg) => update((d) => setLegAt(d, index, fn));
  const commit = (key: 'speed' | 'smooth') => (value: number) => {
    api.log(`segment.${key}`, { index, value });
    patch((l) => ({ ...l, [key]: value }));
    setDraft({ index });
  };

  return {
    leg,
    from: stops[index].name,
    to: stops[index + 1].name,
    total: stops.length - 1,
    straight: legMeta(trip.data, index).straight,
    color: segColor(leg, settings),
    overridden: leg.color !== undefined,
    speed: draft.speed ?? leg.speed ?? 1,
    smooth: draft.smooth ?? leg.smooth ?? 1,
    previewSpeed: (speed: number) => setDraft({ ...draft, index, speed }),
    previewSmooth: (smooth: number) => setDraft({ ...draft, index, smooth }),
    commitSpeed: commit('speed'),
    commitSmooth: commit('smooth'),
    setMode: (mode: Mode) => {
      api.log('segment.mode', { index, mode });
      patch((l) => changeMode(l, mode, models, settings));
    },
    setFigure: (figure: string) => {
      api.log('segment.figure', { index, figure });
      patch((l) => ({ ...l, figure }));
    },
    setColor: (color: string) => {
      api.log('segment.color', { index, color });
      patch((l) => ({ ...l, color }));
    },
    useDefaultColor: () => update((d) => resetColor(d, index)),
    applyColorToAll: () => {
      const count = stops.length - 1;
      update((d) => applyColorToAll(d, segColor(leg, settings)));
      push({ tone: 'info', message: t('inspector.color.appliedAll', { count }) });
    },
  };
}

export type Inspector = NonNullable<ReturnType<typeof useInspector>>;
