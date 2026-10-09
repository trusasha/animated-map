import { Button, ChoiceCard, Switch } from '../../../ds';
import type { Format, Overlay } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import styles from './ExportDialog.module.css';

const FORMATS: Format[] = ['9:16', '4:5', '1:1', '16:9'];
const TOGGLES = [['title', 'tripName'], ['label', 'segmentLabel'], ['progress', 'progress']] as const;

export interface CaptionsStepProps {
  overlay: Overlay;
  onOverlayChange: (o: Overlay) => void;
  format: Format;
  onFormatChange: (f: Format) => void;
  reloading: boolean;
  onRender: () => void;
  onCancel: () => void;
}

export function CaptionsStep({ overlay, onOverlayChange, format, onFormatChange, reloading, onRender, onCancel }: CaptionsStepProps) {
  const { t } = useT();
  return (
    <>
      <div className={styles.group}>
        <h3 className={styles.heading}>{t('export.captions.title')}</h3>
        {TOGGLES.map(([key, label]) => (
          <Switch key={key} placement="start" checked={overlay[key]} onChange={(on) => onOverlayChange({ ...overlay, [key]: on })} label={t(`export.captions.${label}`)} />
        ))}
        <Switch placement="start" checked locked label={t('export.captions.attribution')} sub={t('export.captions.attributionNote')} />
      </div>
      <div className={styles.divided}>
      <fieldset className={styles.group}>
        <legend className={styles.heading}>{t('export.captions.format')}</legend>
        <div className={styles.formats}>
          {FORMATS.map((f) => (
            <ChoiceCard key={f} name="export-format" value={f} checked={f === format} onChange={() => onFormatChange(f)} label={f} sub={t(`export.captions.formats.${f}`)} />
          ))}
        </div>
        <p className={styles.help} role="status">{t(reloading ? 'export.captions.reloading' : 'export.captions.formatHelp')}</p>
      </fieldset>
      </div>
      <div className={styles.actions}>
        <Button disabled={reloading} onClick={onRender}>{t('export.captions.render')}</Button>
        <Button variant="ghost" onClick={onCancel}>{t('export.captions.cancel')}</Button>
      </div>
    </>
  );
}
