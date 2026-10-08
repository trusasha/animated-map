import { Button, Callout, Progress } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from './ExportDialog.module.css';

export function RenderStep({ progress, onCancel }: { progress: number; onCancel: () => void }) {
  const { t } = useT();
  return (
    <>
      <h3 className={styles.heading}>{t('export.render.title')}</h3>
      <Progress value={progress * 100} label={t('export.render.title')} showValue />
      <Callout tone="warning" title={t('export.render.keepOpen')}>{t('export.render.keepOpenBody')}</Callout>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel}>{t('export.render.cancel')}</Button>
      </div>
    </>
  );
}
