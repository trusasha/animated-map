import type { CSSProperties, ReactElement, ReactNode, Ref } from 'react';
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
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function Popover({ trigger, label, children, open, onOpenChange, align = 'start', side = 'bottom', className, style, ref }: PopoverProps) {
  return (
    <BasePopover.Root open={open} onOpenChange={onOpenChange && ((next) => onOpenChange(next))}>
      <BasePopover.Trigger render={trigger} />
      <BasePopover.Portal>
        <BasePopover.Positioner className={styles.positioner} side={side} align={align} sideOffset={6}>
          <BasePopover.Popup ref={ref} style={style} className={cx(styles.popup, className)} aria-label={label}>
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
