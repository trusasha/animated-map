import type { Mode, ModelPose } from '../../../domain/types';
import type { Ref } from 'react';
import { Button, Callout, Icon, Input, Slider } from '../../../ds';
import { useT } from '../../../i18n/react';
import { ModeField } from './ModeField';
import styles from './Figures.module.css';

export interface EditFigureViewProps {
  stageRef: Ref<HTMLDivElement>;
  name: string;
  mode: Mode | null;
  pose: ModelPose;
  busy: boolean;
  error: string;
  canSubmit: boolean;
  onName: (name: string) => void;
  onMode: (mode: Mode | null) => void;
  onScale: (scale: number) => void;
  onOrient: () => void;
  onSubmit: () => void;
  onDelete: () => void;
}

export function EditFigureView({ stageRef, name, mode, pose, busy, error, canSubmit, onName, onMode, onScale, onOrient, onSubmit, onDelete }: EditFigureViewProps) {
  const { t } = useT();
  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(); }}>
      <div className={styles.pose}>
        <div ref={stageRef} data-testid="figure-viewer" className={styles.stage} />
        <span className={styles.hint}>{t('figures.edit.viewerHint')}</span>
        <Button variant="secondary" size="sm" icon={<Icon name="rotate-cw" size={16} />} onClick={onOrient}>{t('figures.orient.open')}</Button>
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
