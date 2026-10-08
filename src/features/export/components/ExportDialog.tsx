import { Dialog, cx, useViewportMode } from '../../../ds';
import type { Trip } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import { useTripContext } from '../../trips';
import { useExport, type ExportPhase } from '../hooks/useExport';
import { useFramePreview } from '../hooks/useFramePreview';
import type { ExportDialogProps } from '../types';
import { CaptionsStep } from './CaptionsStep';
import { DoneStep } from './DoneStep';
import { ErrorStep } from './ErrorStep';
import { ExportStepper } from './ExportStepper';
import { FrameWell } from './FrameWell';
import { PrepareStep } from './PrepareStep';
import { RenderStep } from './RenderStep';
import styles from './ExportDialog.module.css';

const STEP: Record<ExportPhase, number> = { prepare: 0, captions: 1, render: 2, done: 3, error: 2 };

/** the export runs only while the dialog is open: closing it aborts and frees the offscreen map */
export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const { trip } = useTripContext();
  return open && trip ? <ExportFlow trip={trip} onClose={onClose} /> : null;
}

function ExportFlow({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { t } = useT();
  const { mode } = useViewportMode();
  const x = useExport(trip);
  const preview = useFramePreview({ job: x.job, overlay: x.overlay, title: trip.title, style: trip.data.style, progress: x.phase === 'render' ? x.progress : null });
  const withFrame = x.phase === 'captions' || x.phase === 'render' || x.phase === 'done';
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('export.title')}
      width={900}
      dismissible={x.phase !== 'render'}
      fullScreenBelow="phone"
      closeLabel={t('common.aria.close')}
      headerExtra={<ExportStepper current={STEP[x.phase]} compact={mode === 'phone'} />}
    >
      <div className={styles.layout} data-wide={withFrame ? undefined : ''}>
        <FrameWell
          wellRef={preview.wellRef}
          hostRef={x.hostRef}
          canvasRef={preview.canvasRef}
          job={x.job}
          scale={preview.scale}
          hidden={!withFrame}
          videoUrl={x.video?.url}
          frameLabel={t('export.frameLabel')}
          videoLabel={t('export.done.video')}
        />
        <div className={cx(styles.panel, !withFrame && styles.centered)}>
          {x.phase === 'prepare' && <PrepareStep progress={x.progress} onCancel={onClose} />}
          {x.phase === 'captions' && (
            <CaptionsStep
              overlay={x.overlay}
              onOverlayChange={x.setOverlay}
              format={x.format}
              onFormatChange={x.setFormat}
              reloading={x.reloading}
              onRender={x.render}
              onCancel={onClose}
            />
          )}
          {x.phase === 'render' && <RenderStep progress={x.progress} onCancel={x.cancelRender} />}
          {x.phase === 'done' && x.video && (
            <DoneStep fileName={x.video.file.name} canShare={x.video.canShare} onDownload={x.download} onShare={x.share} onDone={onClose} />
          )}
          {x.phase === 'error' && x.error && <ErrorStep code={x.error} onRetry={x.retry} onClose={onClose} />}
        </div>
      </div>
    </Dialog>
  );
}
