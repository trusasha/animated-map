import { useState } from 'react';
import { Button, ConfirmDialog, IconButton, InlineTitleInput, useViewportMode } from '../../../ds';
import { useT } from '../../../i18n/react';
import { useTripActions } from '../hooks/useTripActions';
import { useTripContext } from '../hooks/useTripContext';
import type { AppHeaderProps } from '../types';
import { HeaderOverflowMenu } from './HeaderOverflowMenu';
import { SaveStatusLabel } from './SaveStatusLabel';
import { VideoActions } from './VideoActions';
import styles from './AppHeader.module.css';

export function AppHeader({ tripId, onGoHome, onOpenTrip, onPreview, onExport, onOpenSettings, onOpenFigures, account }: AppHeaderProps) {
  const { t } = useT();
  const { mode } = useViewportMode();
  const { trip, setTitle, discard } = useTripContext();
  const actions = useTripActions();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const editing = tripId !== null;
  const phone = mode === 'phone';
  const desktop = mode === 'desktop';

  const newTrip = async () => {
    const id = await actions.create(trip ? { style: trip.data.style, format: trip.data.format } : undefined);
    if (id) onOpenTrip(id);
  };
  const remove = async () => {
    if (!trip) return;
    discard();
    if (await actions.remove(trip.id)) onGoHome();
    setConfirmingDelete(false);
  };

  return (
    <header className={styles.header} data-mode={mode}>
      {editing && phone ? (
        <IconButton icon="arrow-left" label={t('common.aria.home')} size="touch" onClick={onGoHome} />
      ) : (
        <button type="button" className={styles.wordmark} onClick={onGoHome}>{t('common.appName')}</button>
      )}
      {editing && (
        <>
          {!phone && <div className={styles.divider} />}
          <InlineTitleInput
            className={styles.title}
            label={t('trips.header.tripName')}
            value={trip?.title ?? ''}
            disabled={!trip}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (trip && !trip.title.trim()) setTitle(t('trips.defaultName')); }}
          />
          {!phone && <SaveStatusLabel />}
        </>
      )}
      <div className={styles.spacer} />
      {editing && desktop && <Button variant="ghost" size="sm" loading={actions.busy} onClick={newTrip}>{t('trips.header.newTrip')}</Button>}
      {editing && !phone && <VideoActions onPreview={onPreview} onExport={onExport} short={!desktop} />}
      {editing ? (
        <HeaderOverflowMenu onNewTrip={desktop ? undefined : newTrip} onDelete={() => setConfirmingDelete(true)} onOpenFigures={onOpenFigures} account={account} />
      ) : account && <HeaderOverflowMenu account={account} />}
      <IconButton icon="settings" label={t('trips.header.settings')} size={36} onClick={onOpenSettings} />
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={t('trips.delete.confirmTitle', { name: trip?.title ?? '' })}
        body={t('trips.delete.confirmBody')}
        confirmLabel={t('common.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
        tone="danger"
        loading={actions.busy}
        onConfirm={remove}
      />
    </header>
  );
}
