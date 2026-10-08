import { Button, Card, IconButton, Slider, StatusPill } from '../../../ds';
import { useT } from '../../../i18n/react';
import { usePreview } from '../hooks/usePreview';
import type { PreviewTransportProps } from '../types';
import { PreloadCard } from './PreloadCard';
import styles from './PreviewTransport.module.css';

export function PreviewTransport({ onExit, player }: PreviewTransportProps) {
  const { t } = useT();
  const p = usePreview(player, onExit);
  if (p.loading) return <PreloadCard progress={p.progress} onExit={p.exit} />;
  return (
    <Card className={styles.card} data-testid="preview-transport">
      <div className={styles.row}>
        <IconButton icon={p.playing ? 'pause' : 'play'} label={t(p.playing ? 'preview.pause' : 'preview.resume')} size={36} onClick={p.toggle} />
        <Slider
          className={styles.slider}
          label={t('preview.position')}
          value={p.time}
          max={p.duration}
          step={0.01}
          onChange={p.scrub}
          format={(v) => t('preview.time', { current: v.toFixed(1), total: p.duration.toFixed(0) })}
        />
        <Button variant="ghost" size="sm" onClick={p.exit}>{t('preview.exit')}</Button>
      </div>
      {p.buffering && <StatusPill busy>{t('preview.buffering')}</StatusPill>}
    </Card>
  );
}
