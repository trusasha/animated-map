import { IconButton, Menu, type MenuEntry } from '../../../ds';
import { useT } from '../../../i18n/react';
import type { HeaderAccount } from '../types';

export interface HeaderOverflowMenuProps {
  /** tablet and phone fold "New trip" in here */
  onNewTrip?: () => void;
  /** trip actions; absent on Home */
  onDelete?: () => void;
  onOpenFigures?: () => void;
  account?: HeaderAccount | null;
}

export function HeaderOverflowMenu({ onNewTrip, onDelete, onOpenFigures, account }: HeaderOverflowMenuProps) {
  const { t } = useT();
  const items: MenuEntry[] = [
    ...(onNewTrip ? [{ key: 'new', label: t('trips.header.newTrip'), icon: 'plus' as const, onSelect: onNewTrip }] : []),
    ...(onOpenFigures ? [{ key: 'figures', label: t('trips.header.figures'), icon: 'image' as const, onSelect: onOpenFigures }] : []),
    ...(onDelete ? [{ key: 'delete', label: t('trips.delete.action'), icon: 'trash-2' as const, danger: true, onSelect: onDelete }] : []),
    ...(account ? [
      ...(onDelete ? [{ type: 'separator' as const, key: 'account-sep' }] : []),
      ...(account.email ? [{ key: 'account', label: t('auth.account.signedInAs', { email: account.email }), disabled: true, onSelect: () => {} }] : []),
      { key: 'sign-out', label: t('auth.account.signOut'), onSelect: account.onSignOut },
    ] : []),
  ];
  return <Menu trigger={<IconButton icon="more-horizontal" label={t('common.aria.more')} size={36} />} items={items} />;
}
