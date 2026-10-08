import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { Format, Overlay, Trip } from '../../../domain/types';
import { api } from '../../../services/api';
import { DEFAULT_OVERLAY } from '../../../services/video';
import { useSettings } from '../../settings';
import { useTripContext } from '../../trips';
import { errorCode, isAbort, prepareExport, videoFileName, type ExportErrorCode, type FrameProbe, type PreparedExport } from './exportJob';

export type ExportPhase = 'prepare' | 'captions' | 'render' | 'done' | 'error';
export type ExportJobView = Pick<PreparedExport, 'width' | 'height' | 'hostWidth' | 'hostHeight' | 'frame'>;

export interface ExportController {
  trip: Trip;
  phase: ExportPhase;
  /** 0..1 of the map preload or of the render */
  progress: number;
  /** a format switch is loading the map again; Render waits */
  reloading: boolean;
  job: ExportJobView | null;
  format: Format;
  overlay: Overlay;
  error: ExportErrorCode | null;
  video: { url: string; file: File; canShare: boolean } | null;
  /** ref callback for the element the offscreen map renders into */
  hostRef: (el: HTMLDivElement | null) => void;
  setFormat: (f: Format) => void;
  setOverlay: (o: Overlay) => void;
  render: () => void;
  cancelRender: () => void;
  retry: () => void;
  download: () => void;
  share: () => void;
}

const exposeForTests = import.meta.env.DEV || new URLSearchParams(location.search).has('e2e');
const CANCEL = 'cancel';

const probeForTests = exposeForTests
  ? (p: FrameProbe) => { const w = window as unknown as { __ta?: Record<string, unknown> }; (w.__ta ??= {}).exportProbe = p; }
  : undefined;

function canShareFile(file: File) {
  try { return !!navigator.canShare?.({ files: [file] }); } catch { return false; }
}

/** Prepare → Captions → Render → Done for the open trip; mounted only while the dialog is open */
export function useExport(trip: Trip): ExportController {
  const { update } = useTripContext();
  const { settings } = useSettings();
  const { format, overlay = DEFAULT_OVERLAY } = trip.data;
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const prepared = useRef<PreparedExport | null>(null);
  const rendering = useRef<AbortController | null>(null);
  const started = useRef(0);
  const videoUrl = useRef('');
  const [phase, setPhase] = useState<ExportPhase>('prepare');
  const [progress, setProgress] = useState(0);
  const [reloading, setReloading] = useState(false);
  const [job, setJob] = useState<ExportJobView | null>(null);
  const [error, setError] = useState<ExportErrorCode | null>(null);
  const [video, setVideo] = useState<ExportController['video']>(null);
  const [attempt, setAttempt] = useState(0);

  const fail = (e: unknown, stage: 'prepare' | 'render') => {
    const code = errorCode(e);
    api.log('export.error', { trip: trip.id, format, stage, code, message: e instanceof Error ? e.message : String(e) });
    prepared.current?.destroy();
    prepared.current = null;
    setError(code);
    setPhase('error');
  };

  const prepare = useEffectEvent((el: HTMLDivElement, signal: AbortSignal) =>
    prepareExport({ host: el, trip, format, longSide: settings.exportLongSide, settings, onProgress: setProgress, signal }));
  const onPrepareError = useEffectEvent((e: unknown) => fail(e, 'prepare'));

  useEffect(() => {
    api.log('export.open', { trip: trip.id, format });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!host) return;
    const ctrl = new AbortController();
    prepare(host, ctrl.signal).then((p) => {
      if (ctrl.signal.aborted) { p.destroy(); return; }
      prepared.current = p;
      setJob({ width: p.width, height: p.height, hostWidth: p.hostWidth, hostHeight: p.hostHeight, frame: p.frame });
      setReloading(false);
      setPhase((ph) => (ph === 'prepare' ? 'captions' : ph));
    }).catch((e) => { if (!ctrl.signal.aborted && !isAbort(e)) onPrepareError(e); });
    return () => {
      ctrl.abort();
      prepared.current?.destroy();
      prepared.current = null;
    };
  }, [host, format, attempt]);

  useEffect(() => () => {
    rendering.current?.abort();
    if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
  }, []);

  const render = () => {
    const p = prepared.current;
    if (!p || reloading) return;
    const ctrl = new AbortController();
    rendering.current = ctrl;
    started.current = performance.now();
    setProgress(0);
    setPhase('render');
    p.render({ overlay, onProgress: setProgress, signal: ctrl.signal, onProbe: probeForTests }).then((blob) => {
      const file = new File([blob], videoFileName(trip.title, format), { type: 'video/mp4' });
      api.log('export.done', { trip: trip.id, format, width: p.width, height: p.height, bytes: blob.size, ms: Math.round(performance.now() - started.current) });
      p.destroy();
      prepared.current = null;
      videoUrl.current = URL.createObjectURL(blob);
      setVideo({ url: videoUrl.current, file, canShare: canShareFile(file) });
      setPhase('done');
    }).catch((e) => {
      if (ctrl.signal.reason === CANCEL) { setPhase('captions'); void p.showStill(); } else if (!ctrl.signal.aborted) fail(e, 'render');
    });
  };

  return {
    trip, phase, progress, reloading, job, format, overlay, error, video, hostRef: setHost, render,
    setFormat: (f) => {
      if (f === format) return;
      setReloading(true);
      update((d) => ({ ...d, format: f }));
    },
    setOverlay: (o) => update((d) => ({ ...d, overlay: o })),
    cancelRender: () => rendering.current?.abort(CANCEL),
    retry: () => {
      setError(null);
      setJob(null);
      setReloading(false);
      setProgress(0);
      setPhase('prepare');
      setAttempt((a) => a + 1);
    },
    download: () => {
      if (!video) return;
      const a = document.createElement('a');
      a.href = video.url;
      a.download = video.file.name;
      a.click();
    },
    share: () => {
      if (!video) return;
      api.log('export.share', { trip: trip.id, format });
      navigator.share({ files: [video.file] }).catch(() => {});
    },
  };
}
