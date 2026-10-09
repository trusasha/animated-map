import { api } from '../../../services/api';
import type { TripPlayer } from '../../../services/map';

export interface PreviewHandlers {
  /** 0..1 while the map preloads, null once playback may start */
  onProgress: (p: number | null) => void;
  onPlaying: (playing: boolean) => void;
  onBuffering: (waiting: boolean) => void;
  onTime: (t: number) => void;
  tripId: () => string | undefined;
}

/** one preview run on the map player: preload, play, pause, scrub; dispose hands the map back to the editor */
export function createPreviewSession(player: TripPlayer, h: PreviewHandlers) {
  let loading: AbortController | undefined;
  const log = (type: string, data: object) => api.log(type, { trip: h.tripId(), ...data });

  player.onFrame = (t) => {
    h.onTime(t);
    if (!player.playing) h.onPlaying(false);
  };
  player.onBuffering = h.onBuffering;

  const pause = () => {
    loading?.abort();
    player.stop();
    h.onPlaying(false);
    h.onProgress(null);
    h.onBuffering(false);
  };

  const resume = () => {
    h.onPlaying(true);
    player.play();
  };

  const start = async (): Promise<void> => {
    const t0 = performance.now();
    log('preview.start', { ready: player.ready });
    if (!player.ready) {
      const ctl = (loading = new AbortController());
      h.onProgress(0);
      const from = player.time >= player.duration ? 0 : player.time;
      const done = await player.preload(h.onProgress, ctl.signal, undefined, from);
      log('preview.preloaded', { done, seconds: Math.round((performance.now() - t0) / 1000) });
      if (ctl.signal.aborted) return;
      // the editor rebuilt the player's trip mid-preload: plan again on the new timeline
      if (!done) return start();
      h.onProgress(null);
    }
    resume();
  };

  return {
    start,
    pause,
    resume,
    scrub: (t: number) => { pause(); player.setFrame(t); },
    dispose: () => {
      pause();
      player.onFrame = undefined;
      player.onBuffering = undefined;
      player.setFrame(null);
    },
  };
}
