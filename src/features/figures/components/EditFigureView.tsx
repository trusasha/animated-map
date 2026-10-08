import type { Mode, ModelPose } from '../../../domain/types';
import { Button, Callout, Input, Slider } from '../../../ds';
import { useT } from '../../../i18n/react';
import { ModeField } from './ModeField';
import styles from './Figures.module.css';

export interface EditFigureViewProps {
  src?: string;
  name: string;
  mode: Mode | null;
  pose: ModelPose;
  busy: boolean;
  error: string;
  canSubmit: boolean;
  onName: (name: string) => void;
  onMode: (mode: Mode | null) => void;
  onRotate: (axis: 'rx' | 'ry' | 'rz', deg: number) => void;
  onScale: (scale: number) => void;
  onReset: () => void;
  onSubmit: () => void;
  onDelete: () => void;
}

export function EditFigureView({ src, name, mode, pose, busy, error, canSubmit, onName, onMode, onRotate, onScale, onReset, onSubmit, onDelete }: EditFigureViewProps) {
  const { t } = useT();
  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(); }}>
      <div className={styles.pose}>
        <div className={styles.stage}>
          {src && <img data-testid="figure-pose-preview" className={styles.stageImg} src={src} alt="" />}
        </div>
        <div className={styles.legend}>
          <span>{t('figures.edit.noseLegend')}</span>
          <span>{t('figures.edit.directionLegend')}</span>
        </div>
        <div className={styles.poseTools}>
          <Button variant="secondary" size="sm" onClick={() => onRotate('ry', 180)}>{t('figures.edit.flip')}</Button>
          <Button variant="secondary" size="sm" onClick={() => onRotate('ry', 90)}>{t('figures.edit.turn')}</Button>
          <Button variant="secondary" size="sm" onClick={() => onRotate('rz', 90)}>{t('figures.edit.roll')}</Button>
          <Button variant="secondary" size="sm" onClick={() => onRotate('rx', 90)}>{t('figures.edit.pitch')}</Button>
          <Button variant="ghost" size="sm" onClick={onReset}>{t('figures.edit.reset')}</Button>
        </div>
        <span className={styles.hint}>{t('figures.edit.poseHint')}</span>
        <Slider label={t('figures.edit.size')} min={0.5} max={2} step={0.1} value={pose.scale} onChange={onScale}
          format={(v) => t('figures.edit.sizeValue', { value: v.toFixed(1) })} />
      </div>
      <Input label={t('figures.add.name')} value={name} onChange={(e) => onName(e.target.value)} maxLength={80} />
      <div className={styles.field}><ModeField value={mode} onChange={onMode} /></div>
      <Callout tone="neutral">{t('figures.edit.note')}</Callout>
      {error && <Callout tone="error" live>{error}</Callout>}
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onDelete} disabled={busy}>{t('figures.edit.delete')}</Button>
        <Button type="submit" loading={busy} disabled={!canSubmit && !busy}>{t('figures.edit.save')}</Button>
      </div>
    </form>
  );
}
