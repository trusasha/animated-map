import type { MapStyle, Mode, Overlay } from '../../domain/types';

const MODE_ICON: Record<Mode, string> = { air: '✈', ground: '➜', water: '⚓' };

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
