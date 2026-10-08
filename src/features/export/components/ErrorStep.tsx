import { Button, Callout } from '../../../ds';
import { useT } from '../../../i18n/react';
import type { ExportErrorCode } from '../hooks/exportJob';
import styles from './ExportDialog.module.css';

export function ErrorStep({ code, onRetry, onClose }: { code: ExportErrorCode; onRetry: () => void; onClose: () => void }) {
  const { t } = useT();
  const codec = code === 'codec-unsupported';
  return (
    <>
      <Callout tone="warning" live title={t(codec ? 'export.error.codecTitle' : 'export.error.title')}>
        {t(codec ? 'export.error.codecBody' : 'export.error.body')}
      </Callout>
      <div className={styles.actions}>
        <Button onClick={onRetry}>{t('export.error.retry')}</Button>
        <Button variant="ghost" onClick={onClose}>{t('export.error.close')}</Button>
      </div>
    </>
  );
}
