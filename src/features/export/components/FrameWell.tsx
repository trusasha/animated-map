import type { Ref } from 'react';
import type { ExportJobView } from '../hooks/useExport';
import styles from './ExportDialog.module.css';

export interface FrameWellProps {
  wellRef: Ref<HTMLDivElement>;
  hostRef: Ref<HTMLDivElement>;
  canvasRef: Ref<HTMLCanvasElement>;
  job: ExportJobView | null;
  scale: number;
  /** the map still loads; the well stays mounted so the map has a container */
  hidden: boolean;
  videoUrl?: string;
  frameLabel: string;
  videoLabel: string;
}

export function FrameWell({ wellRef, hostRef, canvasRef, job, scale, hidden, videoUrl, frameLabel, videoLabel }: FrameWellProps) {
  const w = job?.hostWidth ?? 0, h = job?.hostHeight ?? 0;
  return (
    <div ref={wellRef} className={styles.well} data-hidden={hidden || undefined}>
      {videoUrl && <video className={styles.video} src={videoUrl} aria-label={videoLabel} controls autoPlay loop muted playsInline />}
      <div className={styles.frame} role="img" aria-label={frameLabel} hidden={!!videoUrl} style={{ width: w * scale, height: h * scale }}>
        <div className={styles.scaler} style={{ width: w, height: h, transform: `scale(${scale})` }}>
          <div ref={hostRef} />
          <canvas ref={canvasRef} className={styles.captions} width={job?.width} height={job?.height} />
        </div>
      </div>
    </div>
  );
}
