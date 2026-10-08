import { Select, Slider } from '../../ds';
import type { MapStyle } from '../../domain/types';
import { useT } from '../../i18n/react';
import styles from './VideoPanel.module.css';
import type { VideoPanelProps } from './types';

const STYLES: MapStyle[] = ['satellite', 'streets', 'dark', 'ukiyoe'];

export function VideoPanel({ style = 'satellite', speed = 1, onChange }: VideoPanelProps) {
  const { t } = useT();
  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>{t('video.title')}</h3>
      <Select
        native
        label={t('video.mapStyle')}
        value={style}
        options={STYLES.map((s) => ({ value: s, label: t(`video.styles.${s}`) }))}
        onChange={(v) => onChange?.({ style: v as MapStyle })}
      />
      <Slider
        label={t('video.speed')}
        value={speed}
        min={0.5}
        max={2.5}
        step={0.25}
        format={(v) => t('video.speedValue', { value: v })}
        onChange={(v) => onChange?.({ speed: v })}
      />
    </section>
  );
}
