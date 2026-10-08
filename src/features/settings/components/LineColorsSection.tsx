import { ColorSwatchPicker } from '../../../ds';
import { LINE_PALETTE } from '../../../domain/legs';
import type { Mode } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import styles from './Sections.module.css';

interface Props {
  value: Record<Mode, string>;
  onChange: (mode: Mode, color: string) => void;
}

const MODES: Mode[] = ['air', 'ground', 'water'];

export function LineColorsSection({ value, onChange }: Props) {
  const { t } = useT();
  const swatches = LINE_PALETTE.map((p) => ({ value: p.color, label: t(`settings.colors.names.${p.id}`) }));
  return (
    <section className={styles.section}>
      <h3 className={styles.heading}>{t('settings.colors.title')}</h3>
      <p className={styles.help}>{t('settings.colors.help')}</p>
      {MODES.map((mode) => (
        <div key={mode} className={styles.row}>
          <span className={styles.label}>{t(`common.mode.${mode}`)}</span>
          <ColorSwatchPicker
            swatches={swatches}
            value={value[mode]}
            label={t(`common.mode.${mode}`)}
            customLabel={t('settings.colors.custom')}
            onChange={(color) => onChange(mode, color)}
          />
        </div>
      ))}
    </section>
  );
}
