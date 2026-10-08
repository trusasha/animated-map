import { IconButton, ListRow, Menu, useViewportMode } from '../../../ds';
import { formatRelativeTime } from '../../../i18n/format';
import { useT } from '../../../i18n/react';
import type { TripListItem } from '../../../services/api';
import styles from './TripRow.module.css';

export interface TripRowProps {
  trip: TripListItem;
  onOpen: (id: string) => void;
  onRename: (trip: TripListItem) => void;
  onDelete: (trip: TripListItem) => void;
  /** pointer or keyboard focus on the row; null when it leaves */
  onHover: (id: string | null) => void;
}

export function TripRow({ trip, onOpen, onRename, onDelete, onHover }: TripRowProps) {
  const { t, lang } = useT();
  const { coarse } = useViewportMode();
  const { stops, modes } = trip.summary;
  const meta = stops === 0
    ? t('common.noStopsYet')
    : t('trips.meta', { stops: t('common.stops', { count: stops }), modes: modes.map((m) => t(`common.mode.${m}`)).join(', ') });
  const hover = coarse ? undefined : onHover;

  return (
    <ListRow
      className={styles.row}
      title={trip.title}
      meta={meta}
      trailing={formatRelativeTime(lang, t, trip.updated_at)}
      actionsVisible={coarse}
      onSelect={() => onOpen(trip.id)}
      onMouseEnter={() => hover?.(trip.id)}
      onMouseLeave={() => hover?.(null)}
      onFocus={() => hover?.(trip.id)}
      onBlur={() => hover?.(null)}
      data-testid="trip-row"
      actions={(
        <Menu
          trigger={<IconButton icon="more-horizontal" label={t('common.aria.more')} size={coarse ? 'touch' : 28} />}
          items={[
            { key: 'rename', label: t('trips.rename.title'), icon: 'pencil', onSelect: () => onRename(trip) },
            { key: 'delete', label: t('trips.delete.action'), icon: 'trash-2', danger: true, onSelect: () => onDelete(trip) },
          ]}
        />
      )}
    />
  );
}
