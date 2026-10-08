import * as maplibregl from 'maplibre-gl';
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { Animator, idle, loadStyle, TILE_CACHE_ZOOM_LEVELS } from './animator';
import type { Format, LngLat, MapStyle, Mode, Overlay, Stop } from './types';

export const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  '9:16': { w: 1080, h: 1920, label: '9:16 — Reels / Stories / TikTok' },
  '4:5': { w: 1080, h: 1350, label: '4:5 — пост Instagram' },
  '1:1': { w: 1080, h: 1080, label: '1:1 — квадрат' },
  '16:9': { w: 1920, h: 1080, label: '16:9 — YouTube' },
};

const FPS = 30;
const MODE_ICON: Record<Mode, string> = { air: '✈', ground: '➜', water: '⚓' };

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

async function pickCodec(w: number, h: number) {
  for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640033']) {
    const cfg: VideoEncoderConfig = { codec, width: w, height: h, bitrate: 12_000_000, framerate: FPS, avc: { format: 'avc' } };
    if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg;
  }
  throw new Error('Браузер не умеет кодировать H.264 (нужен свежий Chrome / Safari / Edge)');
}

export const DEFAULT_OVERLAY: Overlay = { title: true, label: true, progress: true };
export const attributionOf = (style: MapStyle) => (style === 'satellite' ? '© Esri, Maxar · Mapzen' : '© OpenStreetMap, OpenFreeMap · Mapzen');

/** attribution is always drawn: the tile licenses require it */
export function drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, o: Overlay, title: string, label: string, mode: Mode, progress: number, attribution: string) {
  const u = Math.min(w, h) / 1080;
  if (o.title) {
    const top = ctx.createLinearGradient(0, 0, 0, 260 * u);
    top.addColorStop(0, 'rgba(0,0,0,0.55)'); top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, w, 260 * u);
  }
  if (o.label || o.progress) {
    const bottom = ctx.createLinearGradient(0, h - 300 * u, 0, h);
    bottom.addColorStop(0, 'rgba(0,0,0,0)'); bottom.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = bottom; ctx.fillRect(0, h - 300 * u, w, 300 * u);
  }

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  if (o.title) {
    ctx.font = `800 ${64 * u}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillText(title, w / 2, 130 * u, w - 80 * u);
  }
  if (o.label) {
    ctx.font = `700 ${46 * u}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillText(`${MODE_ICON[mode]}  ${label}`, w / 2, h - 150 * u, w - 80 * u);
  }
  if (o.progress) {
    const bw = w - 160 * u, bx = 80 * u, by = h - 100 * u;
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(bx, by, bw, 8 * u);
    ctx.fillStyle = '#ff4d6d'; ctx.fillRect(bx, by, bw * progress, 8 * u);
  }
  ctx.font = `${18 * u}px system-ui, sans-serif`;
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(attribution, w - 20 * u, h - 20 * u);
}

export async function exportVideo(job: ExportJob): Promise<Blob> {
  const { w, h } = FORMATS[job.format];
  const pr = 2;
  job.host.style.width = `${w / pr}px`;
  job.host.style.height = `${h / pr}px`;

  const style = await loadStyle(job.style);
  const map = new maplibregl.Map({
    container: job.host, style, interactive: false, attributionControl: false, fadeDuration: 0, pixelRatio: pr,
    maxTileCacheZoomLevels: TILE_CACHE_ZOOM_LEVELS,
    canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
  });
  let encoder: VideoEncoder | undefined;
  try {
    const anim = new Animator(map);
    await new Promise((r) => map.once('load', r));
    await anim.setTrip(job.stops, job.legs, job.speed);
    const tl = anim.tl!;
    await anim.preload((p) => job.onProgress(p, 'load'), job.signal);
    anim.setFrame(tl.duration * 0.4);
    await idle(map);
    const overlay = await job.ready(anim.frame!);
    if (job.signal.aborted) throw new DOMException('Отменено', 'AbortError');

    const cfg = await pickCodec(w, h);
    const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: w, height: h, frameRate: FPS }, fastStart: 'in-memory' });
    let failure: unknown;
    encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { failure = e; } });
    encoder.configure(cfg);

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const attribution = attributionOf(job.style);
    const frames = Math.ceil(tl.duration * FPS) + 1;

    for (let i = 0; i < frames; i++) {
      if (job.signal.aborted) throw new DOMException('Отменено', 'AbortError');
      if (failure) throw failure;
      anim.setFrame(i / FPS);
      await idle(map);
      const f = anim.frame!;
      ctx.drawImage(map.getCanvas(), 0, 0, w, h);
      drawOverlay(ctx, w, h, overlay, job.title, f.label, f.mode, i / (frames - 1), attribution);
      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      encoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 5));
      job.onProgress((i + 1) / frames, 'render');
    }
    await encoder.flush();
    muxer.finalize();
    return new Blob([muxer.target.buffer], { type: 'video/mp4' });
  } finally {
    if (encoder && encoder.state !== 'closed') encoder.close();
    map.remove();
  }
}
