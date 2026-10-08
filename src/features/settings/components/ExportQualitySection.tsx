import { Segmented } from '../../../ds';
import type { ExportLongSide } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import styles from './Sections.module.css';

interface Props {
  value: ExportLongSide;
  onChange: (side: ExportLongSide) => void;
}

export function ExportQualitySection({ value, onChange }: Props) {
  const { t } = useT();
  return (
    <section className={styles.section}>
      <h3 className={styles.heading}>{t('settings.exportQuality.title')}</h3>
      <p className={styles.help}>{t('settings.exportQuality.help')}</p>
      <Segmented
        className={styles.narrow}
        label={t('settings.exportQuality.title')}
        value={String(value) as '1080' | '1920'}
        onChange={(v) => onChange(Number(v) as ExportLongSide)}
        options={[
          { value: '1080', label: t('settings.exportQuality.px1080') },
          { value: '1920', label: t('settings.exportQuality.px1920') },
        ]}
      />
    </section>
  );
}
