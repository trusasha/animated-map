import { useState } from 'react';
import { ConfirmDialog } from '../../../ds';
import { useT } from '../../../i18n/react';
import type { TripListItem } from '../../../services/api';
import { useHomeGlobe } from '../hooks/useHomeGlobe';
import { useTripActions } from '../hooks/useTripActions';
import { useTrips } from '../hooks/useTrips';
import type { HomeScreenProps } from '../types';
import { HomeHero } from './HomeHero';
import { RenameDialog } from './RenameDialog';
import { TripList } from './TripList';
import styles from './HomeScreen.module.css';

export function HomeScreen({ onOpenTrip, globe }: HomeScreenProps) {
  const { t } = useT();
  const { trips, failed, reload } = useTrips();
  const actions = useTripActions();
  const hover = useHomeGlobe(globe, trips);
  const [renaming, setRenaming] = useState<TripListItem | null>(null);
  const [deleting, setDeleting] = useState<TripListItem | null>(null);

  const newTrip = async () => {
    const id = await actions.create();
    if (id) onOpenTrip(id);
  };
  const rename = async (title: string) => {
    if (renaming && (await actions.rename(renaming.id, title))) reload();
    setRenaming(null);
  };
  const remove = async () => {
    if (deleting && (await actions.remove(deleting.id))) reload();
    setDeleting(null);
  };

  return (
    <div className={styles.home} data-testid="home-screen">
      <div className={styles.column}>
        <div className={styles.content}>
          <HomeHero busy={actions.busy} onNewTrip={newTrip} />
          <TripList trips={trips} failed={failed} onOpen={onOpenTrip} onRename={setRenaming} onDelete={setDeleting} onHover={hover} />
        </div>
      </div>
      <RenameDialog name={renaming?.title ?? null} onRename={rename} onClose={() => setRenaming(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open) setDeleting(null); }}
        title={t('trips.delete.confirmTitle', { name: deleting?.title ?? '' })}
        body={t('trips.delete.confirmBody')}
        confirmLabel={t('common.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
        tone="danger"
        loading={actions.busy}
        onConfirm={remove}
      />
    </div>
  );
}
