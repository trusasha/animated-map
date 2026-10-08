import { Button, Card, Progress } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from './PreviewTransport.module.css';

export interface PreloadCardProps { progress: number; onExit: () => void }

export function PreloadCard({ progress, onExit }: PreloadCardProps) {
  const { t } = useT();
  const percent = Math.round(progress * 100);
  return (
    <Card className={styles.card} data-testid="preload-card">
      <span className={styles.label}>{t('preview.loadingMap', { percent })}</span>
      <Progress value={percent} label={t('preview.loadingMap', { percent })} size="sm" />
      <Button variant="ghost" size="sm" onClick={onExit}>{t('preview.exit')}</Button>
    </Card>
  );
}
