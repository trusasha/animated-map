import { Slider } from '../../../ds';
import { FLY_KM_RANGE } from '../../../domain/settings';
import { useT } from '../../../i18n/react';
import styles from './Sections.module.css';

interface Props {
  flyKm: number;
  onChange: (km: number) => void;
}

export function NewSegmentsSection({ flyKm, onChange }: Props) {
  const { t } = useT();
  const km = (v: number) => t('settings.newSegments.km', { value: v });
  return (
    <section className={styles.section}>
      <h3 className={styles.heading}>{t('settings.newSegments.title')}</h3>
      <Slider
        label={t('settings.newSegments.flyWhen', { km: km(flyKm) })}
        help={t('settings.newSegments.help')}
        value={flyKm}
        min={FLY_KM_RANGE.min}
        max={FLY_KM_RANGE.max}
        step={50}
        format={km}
        onChange={onChange}
      />
    </section>
  );
}
