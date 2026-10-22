import { span } from '../../../domain/trips';
import { withColors } from '../../../domain/legs';
import { legsOf } from '../../../domain/route';
import { videoSize } from '../../../domain/video';
import type { Format, LngLat, Mode, Overlay, Trip, UserSettings } from '../../../domain/types';
import { api } from '../../../services/api';
import { createOffscreenMap } from '../../../services/map';
import { createOverlay3D } from '../../../services/scene3d';
import { attributionOf, drawOverlay, FPS, isVideoError, renderVideo, type EncoderStats } from '../../../services/video';

export type ExportErrorCode = 'codec-unsupported' | 'failed';
export interface ExportFrame { label: string; mode: Mode }
/** where a frame is at: a tab killed mid-render reports the last one */
/** camera: set, waiting for tiles; draw: map ready, copying into the video frame; encode: handing it to the encoder */
export interface FrameStep { step: 'camera' | 'draw' | 'encode'; frame: number; t: number; leg?: number; zoom?: number; pitch?: number }
/** mid-render sample of the map canvas: a blank map has one colour */
export interface FrameProbe { distinct: number; progress: number }

export interface PreparedExport {
  width: number;
  height: number;
  /** CSS pixels of the map host; the frame preview scales it into the well */
  hostWidth: number;
  hostHeight: number;
  /** the still the captions preview is drawn over */
  frame: ExportFrame;
  /** back to the preview frame, e.g. after a cancelled render */
  showStill(): Promise<void>;
  render(o: { overlay: Overlay; onProgress: (p: number, encoder: EncoderStats) => void; onStep?: (s: FrameStep) => void; signal: AbortSignal; onProbe?: (p: FrameProbe) => void }): Promise<Blob>;
  destroy(): void;
}

// the camera fits the host's CSS size, so it stays fixed and the long side only changes the pixel ratio
const HOST_LONG_SIDE = 960;
const PREVIEW_AT = 0.4;

export const aborted = () => new DOMException('aborted', 'AbortError');
export const isAbort = (e: unknown) => (e instanceof DOMException && e.name === 'AbortError') || isVideoError(e, 'aborted');
export const errorCode = (e: unknown): ExportErrorCode => (isVideoError(e, 'codec-unsupported') ? 'codec-unsupported' : 'failed');

/** "Berlin → Şile" in 9:16 → Berlin-Şile-9x16.mp4 */
export const videoFileName = (title: string, format: Format) => `${title.replace(/[^\p{L}\p{N}]+/gu, '-')}-${format.replace(':', 'x')}.mp4`;

function distinctColors(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const px = ctx.getImageData(0, 0, w, h).data, seen = new Set<number>();
  for (let i = 0; i < px.length && seen.size < 64; i += 4 * 7) seen.add(((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3));
  return seen.size;
}

/** loads the offscreen map for the trip's video stretch and stops on a preview frame */
export async function prepareExport(o: {
  host: HTMLElement; trip: Trip; format: Format; longSide: number; settings: UserSettings; onProgress: (p: number) => void; signal: AbortSignal;
  /** each place keeps one tile level for the whole video instead of swapping imagery as the camera moves */
  stableTiles?: boolean;
}): Promise<PreparedExport> {
  const d = o.trip.data, [s0, s1] = span(d);
  const { width, height } = videoSize(o.format, o.longSide);
  const pr = Math.max(width, height) / HOST_LONG_SIDE;
  const hostWidth = width / pr, hostHeight = height / pr;
  o.host.style.width = `${hostWidth}px`;
  o.host.style.height = `${hostHeight}px`;

  const onFigureError = (figure: string, e: unknown) => api.log('figure.error', { figure, where: 'export', message: e instanceof Error ? e.message : String(e) });
  const map = await createOffscreenMap(o.host, { style: d.style, pixelRatio: pr, stableTiles: o.stableTiles }, createOverlay3D({ onFigureError }));
  try {
    if (o.signal.aborted) throw aborted();
    const { player, idle, canvas } = map;
    const stops = d.stops.slice(s0, s1 + 1);
    const legs = withColors(legsOf(d).slice(s0, s1), o.settings).map((l, i) => ({ ...l, path: l.path ?? [[stops[i].lng, stops[i].lat], [stops[i + 1].lng, stops[i + 1].lat]] as LngLat[] }));
    await player.setTrip(stops, legs, d.speed);
    await player.preload(o.onProgress, o.signal);
    if (o.signal.aborted) throw aborted();
    const duration = player.duration;
    const still = async () => { player.setFrame(duration * PREVIEW_AT); await idle(); };
    await still();
    const f = player.currentFrame()!;
    const attribution = attributionOf(d.style);
    return {
      width, height, hostWidth, hostHeight, frame: { label: f.label, mode: f.mode }, destroy: map.destroy, showStill: still,
      async render({ overlay, onProgress, onStep, signal, onProbe }) {
        let probed = !onProbe, frame = 0, t = 0;
        const step = (s: FrameStep['step'], extra: Partial<FrameStep> = {}) => onStep?.({ step: s, frame, t: Math.round(t * 100) / 100, ...extra });
        return renderVideo({
          width, height, duration, signal, onProgress, onEncode: (i) => step('encode', { frame: i }),
          renderFrame: async (ctx, time, progress) => {
            t = time;
            frame = Math.round(time * FPS);
            player.setFrame(time);
            step('camera');
            await idle();
            const fr = player.currentFrame()!;
            const { zoom, pitch } = map.view();
            step('draw', { leg: fr.legIndex, zoom: Math.round(zoom * 10) / 10, pitch: Math.round(pitch) });
            ctx.drawImage(canvas(), 0, 0, width, height);
            if (!probed && progress >= 0.5) { probed = true; onProbe!({ distinct: distinctColors(ctx, width, height), progress }); }
            drawOverlay(ctx, width, height, overlay, o.trip.title, fr.label, fr.mode, progress, attribution);
          },
        });
      },
    };
  } catch (e) {
    map.destroy();
    throw e;
  }
}
