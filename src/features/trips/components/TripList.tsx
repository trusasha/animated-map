import { Spinner } from '../../../ds';
import { useT } from '../../../i18n/react';
import type { TripListItem } from '../../../services/api';
import { TripRow, type TripRowProps } from './TripRow';
import styles from './TripList.module.css';

export interface TripListProps extends Omit<TripRowProps, 'trip'> {
  /** null while loading */
  trips: TripListItem[] | null;
  failed: boolean;
}

export function TripList({ trips, failed, ...rowProps }: TripListProps) {
  const { t } = useT();
  return (
    <section className={styles.section}>
      <h2 className={styles.label}>{t('home.yourTrips')}</h2>
      {failed && <p className={styles.note} role="alert">{t('home.loadError')}</p>}
      {!failed && trips === null && <Spinner size={20} label={t('common.actions.loading')} />}
      {trips?.length === 0 && <p className={styles.note}>{t('home.empty')}</p>}
      {!!trips?.length && (
        <div className={styles.list} role="list">
          {trips.map((trip) => <div key={trip.id} role="listitem" className={styles.item}><TripRow trip={trip} {...rowProps} /></div>)}
        </div>
      )}
    </section>
  );
}
