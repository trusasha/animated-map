import { useEffect, useRef, useState } from 'react';
import { api } from '../../../services/api';
import type { TripPlayer } from '../../../services/map';
import { useTripContext } from '../../trips';

/** drives the map player for the lifetime of the component: starts on mount, stops and returns the editor layers on unmount */
export function usePreview(player: TripPlayer | undefined, onExit: () => void) {
  const tripId = useTripContext().trip?.id;
  const [progress, setProgress] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [time, setTime] = useState(0);
  const latest = useRef({ tripId, onExit });
  latest.current = { tripId, onExit };
  const loading = useRef<AbortController | null>(null);

  const stop = () => {
    loading.current?.abort();
    player?.stop();
    setPlaying(false);
    setProgress(null);
    setBuffering(false);
  };

  const play = async () => {
    if (!player) return;
    const t0 = performance.now();
    const log = (type: string, data: object) => api.log(type, { trip: latest.current.tripId, ...data });
    if (!player.ready) {
      const ctl = (loading.current = new AbortController());
      log('preview.start', { ready: false });
      setProgress(0);
      const done = await player.preload(setProgress, ctl.signal, undefined, player.time >= player.duration ? 0 : player.time);
      log('preview.preloaded', { done, seconds: Math.round((performance.now() - t0) / 1000) });
      if (!done || ctl.signal.aborted) return;
      setProgress(null);
    } else log('preview.start', { ready: true });
    setPlaying(true);
    player.play();
  };

  const resume = () => {
    if (!player) return;
    setPlaying(true);
    player.play();
  };

  useEffect(() => {
    if (!player) return;
    player.onFrame = (t) => {
      setTime(t);
      if (!player.playing) setPlaying(false);
    };
    player.onBuffering = setBuffering;
    void play();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') latest.current.onExit(); };
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      stop();
      player.onFrame = undefined;
      player.onBuffering = undefined;
      player.setFrame(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- play/stop only close over `player`
  }, [player]);

  return {
    loading: progress !== null,
    progress: progress ?? 0,
    playing,
    buffering: buffering && playing,
    time,
    duration: player?.duration ?? 0,
    toggle: () => (playing ? stop() : resume()),
    scrub: (t: number) => { stop(); player?.setFrame(t); },
    exit: () => latest.current.onExit(),
  };
}
