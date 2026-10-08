import { createOffscreenMap } from './services/map';
import { createOverlay3D } from './services/scene3d';
import { attributionOf, DEFAULT_OVERLAY, drawOverlay, isVideoError, renderVideo } from './services/video';
import type { Format, LngLat, MapStyle, Mode, Overlay, Stop } from './types';

export { attributionOf, DEFAULT_OVERLAY, drawOverlay };

export const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  '9:16': { w: 1080, h: 1920, label: '9:16 — Reels / Stories / TikTok' },
  '4:5': { w: 1080, h: 1350, label: '4:5 — пост Instagram' },
  '1:1': { w: 1080, h: 1080, label: '1:1 — квадрат' },
  '16:9': { w: 1920, h: 1080, label: '16:9 — YouTube' },
};

export interface ExportJob {
  title: string; stops: Stop[]; legs: { mode: Mode; figure: string; path: LngLat[] }[];
  style: MapStyle; format: Format; speed: number;
  /** element the offscreen map renders into; doubles as a live preview */
  host: HTMLElement;
  onProgress: (p: number, stage: 'load' | 'render') => void;
  /** called once tiles are loaded and a preview frame is on screen; resolves with the captions to burn in */
  ready: (f: { label: string; mode: Mode }) => Promise<Overlay>;
  signal: AbortSignal;
}

const aborted = () => new DOMException('Отменено', 'AbortError');

export async function exportVideo(job: ExportJob): Promise<Blob> {
  const { w, h } = FORMATS[job.format];
  const pr = 2;
  job.host.style.width = `${w / pr}px`;
  job.host.style.height = `${h / pr}px`;

  const { player, idle, canvas, destroy } = await createOffscreenMap(job.host, { style: job.style, pixelRatio: pr }, createOverlay3D());
  try {
    await player.setTrip(job.stops, job.legs, job.speed);
    const duration = player.duration;
    await player.preload((p) => job.onProgress(p, 'load'), job.signal);
    player.setFrame(duration * 0.4);
    await idle();
    const overlay = await job.ready(player.currentFrame()!);
    if (job.signal.aborted) throw aborted();

    const attribution = attributionOf(job.style);
    return await renderVideo({
      width: w, height: h, duration, signal: job.signal,
      onProgress: (p) => job.onProgress(p, 'render'),
      renderFrame: async (ctx, t, progress) => {
        player.setFrame(t);
        await idle();
        const f = player.currentFrame()!;
        ctx.drawImage(canvas(), 0, 0, w, h);
        drawOverlay(ctx, w, h, overlay, job.title, f.label, f.mode, progress, attribution);
      },
    });
  } catch (e) {
    if (isVideoError(e, 'aborted')) throw aborted();
    if (isVideoError(e, 'codec-unsupported')) throw new Error('Браузер не умеет кодировать H.264 (нужен свежий Chrome / Safari / Edge)');
    throw e;
  } finally {
    destroy();
  }
}
