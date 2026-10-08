import { useEffect, useRef, useState } from 'react';
import type { MapStyle, Overlay } from '../../../domain/types';
import { attributionOf, drawOverlay } from '../../../services/video';
import type { ExportJobView } from './useExport';

const STILL_PROGRESS = 0.4;

/** fits the export frame into the well and draws the burned-in captions over it */
export function useFramePreview(o: { job: ExportJobView | null; overlay: Overlay; title: string; style: MapStyle; progress: number | null }) {
  const wellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [well, setWell] = useState({ width: 0, height: 0 });
  const { job, overlay, title, style } = o;
  const progress = o.progress ?? STILL_PROGRESS;

  useEffect(() => {
    const el = wellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWell({ width: e.contentRect.width, height: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !job) return;
    ctx.clearRect(0, 0, job.width, job.height);
    drawOverlay(ctx, job.width, job.height, overlay, title, job.frame.label, job.frame.mode, progress, attributionOf(style));
  }, [job, overlay, title, style, progress]);

  const scale = job && well.width ? Math.min(1, well.width / job.hostWidth, well.height / job.hostHeight) : 0.4;
  return { wellRef, canvasRef, scale };
}
