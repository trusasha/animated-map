import type { ReactElement, ReactNode } from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { cx } from '../../lib/cx';
import styles from './Popover.module.css';

export interface PopoverProps {
  trigger: ReactElement;
  /** Accessible name of the popup. */
  label: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Popover({ trigger, label, children, open, onOpenChange, align = 'start', side = 'bottom', className }: PopoverProps) {
  return (
    <BasePopover.Root open={open} onOpenChange={onOpenChange && ((next) => onOpenChange(next))}>
      <BasePopover.Trigger render={trigger} />
      <BasePopover.Portal>
        <BasePopover.Positioner className={styles.positioner} side={side} align={align} sideOffset={6}>
          <BasePopover.Popup className={cx(styles.popup, className)} aria-label={label}>
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
