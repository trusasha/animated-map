import { useCallback, useEffect, useRef, useState } from 'react';
import type { LngLat, Stop } from '../../../domain/types';
import type { MapService } from '../../../services/map';

/** "Move on map": the next map click places the stop `pickingId`; Esc or a route edit cancels */
export function usePick(map: MapService | undefined, stops: Stop[], onPickChange: (picking: boolean) => void, onPicked: (id: string, p: LngLat) => void) {
  const [pickingId, setPickingId] = useState<string | null>(null);
  const cancelPick = useRef<(() => void) | null>(null);
  const host = useRef({ onPickChange, onPicked });
  useEffect(() => { host.current = { onPickChange, onPicked }; });

  const stop = useCallback(() => {
    cancelPick.current?.();
    cancelPick.current = null;
    setPickingId(null);
    host.current.onPickChange(false);
  }, []);

  const start = (id: string) => {
    if (!map) return;
    cancelPick.current?.();
    setPickingId(id);
    host.current.onPickChange(true);
    cancelPick.current = map.startPick((p) => {
      cancelPick.current = null;
      setPickingId(null);
      host.current.onPickChange(false);
      host.current.onPicked(id, p);
    });
  };

  useEffect(() => {
    if (pickingId === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') stop(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickingId, stop]);

  const exists = pickingId !== null && stops.some((s) => s.id === pickingId);
  useEffect(() => { if (pickingId !== null && !exists) stop(); }, [pickingId, exists, stop]);
  useEffect(() => () => cancelPick.current?.(), []);

  return { pickingId, start, stop, canPick: !!map };
}
