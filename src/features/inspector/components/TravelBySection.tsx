import { Callout, Segmented } from '../../../ds';
import type { Mode } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import styles from './Inspector.module.css';

const MODES: Mode[] = ['air', 'ground', 'water'];

export interface TravelBySectionProps { mode: Mode; straight: boolean; onChange: (mode: Mode) => void }

export function TravelBySection({ mode, straight, onChange }: TravelBySectionProps) {
  const { t } = useT();
  return (
    <section className={styles.section}>
      <h3 className={styles.label}>{t('inspector.travelBy')}</h3>
      <Segmented
        label={t('inspector.travelBy')}
        value={mode}
        options={MODES.map((m) => ({ value: m, label: t(`common.mode.${m}`) }))}
        onChange={onChange}
      />
      <span className={styles.note}>{t(`inspector.modeNote.${mode}`)}</span>
      {straight && <Callout tone="warning">{t('inspector.noRoad')}</Callout>}
    </section>
  );
}
