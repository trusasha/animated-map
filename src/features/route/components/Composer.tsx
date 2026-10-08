import { Button, Callout, Textarea } from '../../../ds';
import { useT } from '../../../i18n/react';
import { useComposer } from '../hooks/useComposer';
import type { ComposerTripApi } from '../hooks/useAiParse';
import styles from './Composer.module.css';

export interface ComposerProps extends ComposerTripApi {
  /** the route was replaced: the host closes the composer and refits the map */
  onDone?: () => void;
}

export function Composer({ trip, update, onDone }: ComposerProps) {
  const { t } = useT();
  const c = useComposer({ trip, update }, onDone);
  return (
    <section className={styles.composer} aria-labelledby="composer-title">
      <h3 id="composer-title" className={styles.title}>{t('composer.title')}</h3>
      {c.enabled === false ? (
        <Callout>{t('composer.noKey')}</Callout>
      ) : (
        <p className={styles.hint}>{c.hasRoute ? t('composer.hintReplace') : t('composer.hintNew')}</p>
      )}
      <Textarea
        rows={4}
        aria-label={t('composer.title')}
        placeholder={t('composer.placeholder')}
        value={c.text}
        disabled={c.enabled !== true || !!c.status}
        onChange={(e) => c.setText(e.target.value)}
      />
      <div className={styles.actions}>
        <Button variant={c.recording ? 'danger' : 'secondary'} size="sm" disabled={c.micDisabled} onClick={c.toggleMic}>
          {c.recording ? t('composer.stop') : t('composer.speak')}
        </Button>
        <Button size="sm" disabled={c.buildDisabled} onClick={c.build}>{t('composer.build')}</Button>
      </div>
      {c.status && <p className={styles.status} role="status">{c.status}</p>}
    </section>
  );
}
