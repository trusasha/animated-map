import { useRef } from 'react';
import type { Mode } from '../../../domain/types';
import { Button, Callout, Input } from '../../../ds';
import { useT } from '../../../i18n/react';
import { ModeField } from './ModeField';
import styles from './Figures.module.css';

export interface AddFigureViewProps {
  fileName?: string;
  kind: 'none' | 'glb' | 'heic' | 'photo';
  preview?: string;
  photo3d: boolean;
  name: string;
  mode: Mode | null;
  busy: boolean;
  error: string;
  canSubmit: boolean;
  onPick: (file: File | undefined) => void;
  onName: (name: string) => void;
  onMode: (mode: Mode | null) => void;
  onSubmit: () => void;
}

export function AddFigureView({ fileName, kind, preview, photo3d, name, mode, busy, error, canSubmit, onPick, onName, onMode, onSubmit }: AddFigureViewProps) {
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const fileLine = kind === 'none' ? t('figures.add.noFile') : kind === 'glb' ? t('figures.add.glbReady') : kind === 'heic' ? t('figures.add.heicPreview') : fileName;
  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(); }}>
      <div className={styles.drop}>
        {preview && <img className={styles.preview} src={preview} alt="" />}
        <span className={styles.fileName}>{fileLine}</span>
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {kind === 'none' ? t('figures.add.chooseFile') : t('figures.add.chooseAnother')}
        </Button>
        <input ref={input} data-testid="figure-file" aria-label={t('figures.add.chooseFile')} className={styles.hidden} type="file" tabIndex={-1}
          accept={photo3d ? 'image/*,.heic,.heif,.glb' : '.glb,model/gltf-binary'} onChange={(e) => onPick(e.target.files?.[0])} />
        <span className={styles.hint}>{t('figures.add.fileHint')}</span>
      </div>
      {photo3d ? <Callout tone="info">{t('figures.add.tips')}</Callout> : <Callout tone="warning">{t('figures.add.noFalKey')}</Callout>}
      <Input label={t('figures.add.name')} value={name} onChange={(e) => onName(e.target.value)} maxLength={80} />
      <div className={styles.field}>
        <ModeField value={mode} onChange={onMode} />
        <span className={styles.hint}>{t('figures.add.travelsByHelp')}</span>
      </div>
      {error && <Callout tone="error" live>{error}</Callout>}
      <div className={styles.actions}>
        {kind === 'photo' || kind === 'heic' ? <span className={styles.hint}>{t('figures.add.takesTime')}</span> : null}
        <Button type="submit" loading={busy} disabled={!canSubmit && !busy}>
          {busy ? t('figures.add.saving') : kind === 'photo' || kind === 'heic' ? t('figures.add.makeModel') : t('figures.add.saveFigure')}
        </Button>
      </div>
    </form>
  );
}
