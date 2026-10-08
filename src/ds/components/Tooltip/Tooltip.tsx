import type { CSSProperties, ReactElement, ReactNode, Ref } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { cx } from '../../lib/cx';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  /** Focusable element the tooltip describes. */
  children: ReactElement;
  content: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export interface TooltipProviderProps {
  /** Hover delay shared by every Tooltip inside, in ms. */
  delay?: number;
  /** Window after one tooltip closes in which the next opens instantly, in ms. */
  timeout?: number;
  children: ReactNode;
}

export function TooltipProvider({ delay = 400, timeout = 400, children }: TooltipProviderProps) {
  return (
    <BaseTooltip.Provider delay={delay} timeout={timeout}>
      {children}
    </BaseTooltip.Provider>
  );
}

export function Tooltip({ children, content, side = 'top', delay, className, style, ref }: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} delay={delay} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner className={styles.positioner} side={side} sideOffset={6}>
          <BaseTooltip.Popup ref={ref} style={style} className={cx(styles.popup, className)}>
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
