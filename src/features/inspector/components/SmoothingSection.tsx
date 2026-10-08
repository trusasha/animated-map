import { Slider } from '../../../ds';
import type { Mode } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import styles from './Inspector.module.css';

export interface SmoothingSectionProps { mode: Mode; value: number; onChange: (v: number) => void; onCommit: (v: number) => void }

export function SmoothingSection({ mode, value, onChange, onCommit }: SmoothingSectionProps) {
  const { t } = useT();
  if (mode === 'air') {
    return (
      <section className={styles.section}>
        <h3 className={styles.label}>{t('inspector.smoothing.label')}</h3>
        <span className={styles.note}>{t('inspector.smoothing.airNote')}</span>
      </section>
    );
  }
  return (
    <Slider
      label={t('inspector.smoothing.label')}
      value={value}
      min={0}
      max={4}
      step={0.5}
      format={(v) => (v === 0 ? t('inspector.smoothing.exact') : t('inspector.smoothing.value', { value: v }))}
      startLabel={t('inspector.smoothing.exactRoad')}
      endLabel={t('inspector.smoothing.smoothTurns')}
      onChange={onChange}
      onCommit={onCommit}
    />
  );
}
