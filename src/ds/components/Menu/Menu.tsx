import type { ReactElement } from 'react';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { cx } from '../../lib/cx';
import { Icon, type IconName } from '../Icon';
import styles from './Menu.module.css';

export type MenuEntry =
  | { type: 'separator'; key: string }
  | {
      type?: 'item';
      key: string;
      label: string;
      icon?: IconName;
      danger?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    };

export interface MenuProps {
  /** Element that opens the menu (an IconButton or Button). */
  trigger: ReactElement;
  items: readonly MenuEntry[];
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Menu({ trigger, items, align = 'end', side = 'bottom', className }: MenuProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner className={styles.positioner} side={side} align={align} sideOffset={4}>
          <BaseMenu.Popup className={cx(styles.popup, className)}>
            {items.map((entry) =>
              entry.type === 'separator' ? (
                <BaseMenu.Separator key={entry.key} className={styles.separator} />
              ) : (
                <BaseMenu.Item
                  key={entry.key}
                  className={styles.item}
                  data-danger={entry.danger || undefined}
                  disabled={entry.disabled}
                  onClick={entry.onSelect}
                >
                  {entry.icon && <Icon name={entry.icon} size={16} />}
                  <span className={styles.label}>{entry.label}</span>
                </BaseMenu.Item>
              ),
            )}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
