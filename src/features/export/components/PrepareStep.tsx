import { Button, Progress } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from './ExportDialog.module.css';

export function PrepareStep({ progress, onCancel }: { progress: number; onCancel: () => void }) {
  const { t } = useT();
  return (
    <>
      <h3 className={styles.heading}>{t('export.prepare.title')}</h3>
      <Progress value={progress * 100} label={t('export.prepare.title')} showValue />
      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={onCancel}>{t('export.prepare.cancel')}</Button>
      </div>
    </>
  );
}
