import type { Ref } from 'react';
import type { AngleKey } from '../../../domain/orientation';
import type { ModelPose } from '../../../domain/types';
import { Button, Callout, Icon, Input } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from './Figures.module.css';

export interface OrientationViewProps {
  stageRef: Ref<HTMLDivElement>;
  pose: ModelPose;
  /** bumps on every change so the typed fields show the current angles */
  revision: number;
  busy: boolean;
  error: string;
  dirty: boolean;
  onTurn: (key: AngleKey, deg: number) => void;
  onAngle: (key: AngleKey, text: string) => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
}

const KEYS: AngleKey[] = ['rx', 'ry', 'rz'];

export function OrientationView({ stageRef, pose, revision, busy, error, dirty, onTurn, onAngle, onReset, onCancel, onSave }: OrientationViewProps) {
  const { t } = useT();
  return (
    <div className={styles.form}>
      <div className={styles.pose}>
        <div ref={stageRef} data-testid="orientation-viewer" className={styles.orientStage} />
        <span className={styles.hint}>{t('figures.orient.hint')}</span>
      </div>
      <div className={styles.angles}>
        {KEYS.map((k) => {
          const label = t(`figures.orient.${k}`);
          return (
            <div key={k} className={styles.angleRow}>
              <Input
                key={`${k}-${revision}`} label={label} defaultValue={String(pose[k])} inputMode="decimal" className={styles.angleInput}
                onBlur={(e) => onAngle(k, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
              />
              <Button variant="secondary" size="sm" aria-label={t('figures.orient.turn', { axis: label, deg: '−90' })} onClick={() => onTurn(k, -90)}>−90°</Button>
              <Button variant="secondary" size="sm" aria-label={t('figures.orient.turn', { axis: label, deg: '+90' })} onClick={() => onTurn(k, 90)}>+90°</Button>
            </div>
          );
        })}
      </div>
      <Callout tone="neutral">{t('figures.orient.note')}</Callout>
      {error && <Callout tone="error" live>{error}</Callout>}
      <div className={styles.actions}>
        <Button variant="ghost" icon={<Icon name="rotate-cw" size={16} />} onClick={onReset} disabled={busy} className={styles.pushLeft}>{t('figures.orient.reset')}</Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>{t('figures.orient.cancel')}</Button>
        <Button onClick={onSave} loading={busy} disabled={!dirty && !busy}>{t('figures.orient.save')}</Button>
      </div>
    </div>
  );
}
