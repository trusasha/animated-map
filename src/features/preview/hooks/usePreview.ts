import { useEffect, useRef, useState } from 'react';
import type { TripPlayer } from '../../../services/map';
import { useTripContext } from '../../trips';
import { createPreviewSession } from './previewSession';

/** drives the map player for the lifetime of the component: starts on mount, stops and returns the editor layers on unmount */
export function usePreview(player: TripPlayer | undefined, onExit: () => void) {
  const tripId = useTripContext().trip?.id;
  const [progress, setProgress] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [time, setTime] = useState(0);
  const latest = useRef({ tripId, onExit });
  const session = useRef<ReturnType<typeof createPreviewSession>>(undefined);

  useEffect(() => { latest.current = { tripId, onExit }; });

  useEffect(() => {
    if (!player) return;
    const s = createPreviewSession(player, {
      onProgress: setProgress, onPlaying: setPlaying, onBuffering: setBuffering, onTime: setTime, tripId: () => latest.current.tripId,
    });
    session.current = s;
    void s.start();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') latest.current.onExit(); };
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      s.dispose();
    };
  }, [player]);

  return {
    loading: progress !== null,
    progress: progress ?? 0,
    playing,
    buffering: buffering && playing,
    time,
    duration: player?.duration ?? 0,
    toggle: () => (playing ? session.current?.pause() : session.current?.resume()),
    scrub: (t: number) => session.current?.scrub(t),
    exit: () => latest.current.onExit(),
  };
}
