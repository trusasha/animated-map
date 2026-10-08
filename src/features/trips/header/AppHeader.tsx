import { useState } from 'react';
import { Button, ConfirmDialog, IconButton, InlineTitleInput, useViewportMode } from '../../../ds';
import { useT } from '../../../i18n/react';
import { useTripActions } from '../hooks/useTripActions';
import { useTripContext } from '../hooks/useTripContext';
import type { AppHeaderProps, SaveStatus } from '../types';
import { HeaderOverflowMenu } from './HeaderOverflowMenu';
import styles from './AppHeader.module.css';

const STATUS_KEY = { saving: 'trips.header.saving', saved: 'trips.header.saved', error: 'trips.header.saveFailed' } as const;

const statusText = (status: SaveStatus) => (status === 'idle' ? '' : STATUS_KEY[status]);

export function AppHeader({ tripId, onGoHome, onOpenTrip, onPreview, onExport, onOpenSettings }: AppHeaderProps) {
  const { t } = useT();
  const { mode } = useViewportMode();
  const { trip, setTitle, discard, saveStatus, routing } = useTripContext();
  const actions = useTripActions();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const editing = tripId !== null;
  const phone = mode === 'phone';
  const desktop = mode === 'desktop';
  const canShow = !!trip && trip.data.stops.length >= 2 && !routing;
  const status = statusText(saveStatus);

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
          {!phone && <span className={styles.status} role="status">{status && t(status)}</span>}
        </>
      )}
      <div className={styles.spacer} />
      {editing && desktop && <Button variant="ghost" size="sm" loading={actions.busy} onClick={newTrip}>{t('trips.header.newTrip')}</Button>}
      {editing && !phone && (
        <>
          <Button variant="secondary" disabled={!canShow} onClick={onPreview}>{t('trips.header.preview')}</Button>
          <Button disabled={!canShow} onClick={onExport}>{t(desktop ? 'trips.header.exportVideo' : 'trips.header.export')}</Button>
        </>
      )}
      {editing && <HeaderOverflowMenu onNewTrip={desktop ? undefined : newTrip} onDelete={() => setConfirmingDelete(true)} />}
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
