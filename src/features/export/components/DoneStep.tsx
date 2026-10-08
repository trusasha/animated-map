import { Button, Icon } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from './ExportDialog.module.css';

export interface DoneStepProps { fileName: string; canShare: boolean; onDownload: () => void; onShare: () => void; onDone: () => void }

export function DoneStep({ fileName, canShare, onDownload, onShare, onDone }: DoneStepProps) {
  const { t } = useT();
  return (
    <>
      <h3 className={styles.heading}>{t('export.done.title')}</h3>
      <p className={styles.file}>{fileName}</p>
      <div className={styles.actions}>
        {canShare && <Button icon={<Icon name="share" size={16} />} onClick={onShare}>{t('export.done.share')}</Button>}
        <Button variant={canShare ? 'secondary' : 'primary'} icon={<Icon name="download" size={16} />} onClick={onDownload}>{t('export.done.download')}</Button>
        <Button variant="ghost" onClick={onDone}>{t('export.done.done')}</Button>
      </div>
      <p className={styles.help}>{t('export.done.hint')}</p>
    </>
  );
}
