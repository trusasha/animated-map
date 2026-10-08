import { IconButton, Menu, type MenuEntry } from '../../../ds';
import { useT } from '../../../i18n/react';

export interface HeaderOverflowMenuProps {
  /** tablet and phone fold "New trip" in here */
  onNewTrip?: () => void;
  onDelete: () => void;
}

export function HeaderOverflowMenu({ onNewTrip, onDelete }: HeaderOverflowMenuProps) {
  const { t } = useT();
  const items: MenuEntry[] = [
    ...(onNewTrip ? [{ key: 'new', label: t('trips.header.newTrip'), icon: 'plus' as const, onSelect: onNewTrip }] : []),
    { key: 'delete', label: t('trips.delete.action'), icon: 'trash-2', danger: true, onSelect: onDelete },
  ];
  return <Menu trigger={<IconButton icon="more-horizontal" label={t('common.aria.more')} size={36} />} items={items} />;
}
