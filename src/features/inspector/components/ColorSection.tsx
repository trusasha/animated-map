import { ColorSwatchPicker, LinkButton } from '../../../ds';
import { LINE_PALETTE } from '../../../domain/legs';
import type { Mode } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import styles from './Inspector.module.css';

export interface ColorSectionProps {
  mode: Mode;
  color: string;
  overridden: boolean;
  onChange: (color: string) => void;
  onUseDefault: () => void;
  onApplyAll: () => void;
}

export function ColorSection({ mode, color, overridden, onChange, onUseDefault, onApplyAll }: ColorSectionProps) {
  const { t } = useT();
  const swatches = LINE_PALETTE.map((p) => ({ value: p.color, label: t(`inspector.color.names.${p.id}`) }));
  return (
    <section className={styles.section}>
      <h3 className={styles.label}>{t('inspector.color.label')}</h3>
      <ColorSwatchPicker swatches={swatches} value={color} label={t('inspector.color.label')} customLabel={t('inspector.color.custom')} onChange={onChange} />
      <span className={styles.note}>
        {overridden ? t('inspector.color.onlyThis') : t('inspector.color.defaultFor', { mode: t(`common.mode.${mode}`) })}
      </span>
      <div className={styles.actions}>
        {overridden && <LinkButton size="sm" onClick={onUseDefault}>{t('inspector.color.useDefault')}</LinkButton>}
        <LinkButton size="sm" onClick={onApplyAll}>{t('inspector.color.applyAll')}</LinkButton>
      </div>
    </section>
  );
}
