import { Button, Progress } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from './ExportDialog.module.css';

export function PrepareStep({ progress, onCancel }: { progress: number; onCancel: () => void }) {
  const { t } = useT();
  return (
    <div className={styles.prepare}>
      <h3 className={styles.heading}>{t('export.prepare.title')}</h3>
      <Progress className={styles.prepareBar} value={progress * 100} label={t('export.prepare.title')} />
      <span className={styles.pct} aria-hidden="true">{Math.round(progress * 100)}%</span>
      <Button variant="ghost" size="sm" onClick={onCancel}>{t('export.prepare.cancel')}</Button>
    </div>
  );
}
