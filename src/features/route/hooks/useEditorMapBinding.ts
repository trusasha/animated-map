import { useEffect, useRef } from 'react';
import { legMeta } from '../../../domain/legs';
import { legsOf } from '../../../domain/route';
import { span } from '../../../domain/trips';
import type { LngLat, TripData } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import type { MapService } from '../../../services/map';
import { useSettings } from '../../settings';
import { reportError } from '../../toasts';
import { editorView, fitPoints } from './editorView';

export interface EditorMapBindingArgs {
  map: MapService | undefined;
  data: TripData | undefined;
  selected: number | null;
  pickingId: string | null;
  onSelect: (index: number | null) => void;
  /** a marker was dragged: stop index and the new place */
  onStopDrag: (index: number, p: LngLat) => void;
  /** null until the figure poses are loaded: a player trip built earlier would draw models unposed */
  poseKey: string | null;
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fitOptions = (leg: boolean) => ({ maxZoom: leg ? 13 : 9, duration: reduced() ? 0 : 800 });

export function useEditorMapBinding({ map, data, selected, pickingId, onSelect, onStopDrag, poseKey }: EditorMapBindingArgs) {
  const { t } = useT();
  const { settings } = useSettings();
  const host = useRef({ onSelect, onStopDrag });
  useEffect(() => { host.current = { onSelect, onStopDrag }; });

  useEffect(() => { map?.setMode('editor'); }, [map]);

  useEffect(() => {
    if (!map || !data) return;
    map.setEditorRoute(editorView({ data, settings, selected, pickingId, titleOf: (name) => t('route.markerTitle', { name }) }));
  }, [map, data, settings, selected, pickingId, t]);

  useEffect(() => {
    if (!map) return;
    const offs = [
      map.onSegmentClick((i) => host.current.onSelect(i)),
      map.onEmptyClick(() => host.current.onSelect(null)),
      map.onStopDrag((i, p) => host.current.onStopDrag(i, p)),
    ];
    return () => offs.forEach((off) => off());
  }, [map]);

  const fitted = useRef('');
  const stops = data?.stops, speed = data?.speed, range = data?.range;
  useEffect(() => {
    if (!map || !data || !stops || poseKey === null) return;
    if (stops.length < 2) {
      map.player.clear();
      return;
    }
    const legs = legsOf(data);
    if (legs.some((_, i) => legMeta(data, i).building)) return;
    let cancelled = false;
    (async () => {
      const [s0, s1] = span(data);
      map.player.stop();
      await map.player.setTrip(stops.slice(s0, s1 + 1), legs.slice(s0, s1).map((l) => ({ ...l, path: l.path! })), data.speed);
      if (cancelled) return;
      map.setContext(legs.flatMap((l, i) => (i < s0 || i >= s1) && l.path ? [l.path] : []));
      map.player.setFrame(null);
      const key = stops.slice(s0, s1 + 1).map((s) => `${s.id}@${s.lng},${s.lat}`).join();
      if (key !== fitted.current) {
        fitted.current = key;
        void map.fitTo(fitPoints(data, null), fitOptions(false));
      }
    })().catch(reportError);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- legs live on the stops; selection and colours must not rebuild the player
  }, [map, stops, speed, range, poseKey]);

  const shown = useRef<number | null>(null);
  useEffect(() => {
    if (!map || !data || shown.current === selected) return;
    shown.current = selected;
    if (selected === null && stops && stops.length < 2) return;
    void map.fitTo(fitPoints(data, selected), fitOptions(selected !== null));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fits when the selection changes, not on every edit
  }, [map, selected]);
}
