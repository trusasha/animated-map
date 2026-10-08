import { useRef, type CSSProperties, type ReactNode, type Ref, type RefObject } from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cx } from '../../lib/cx';
import { wrapFocusFromGuard } from '../../lib/focusGuard';
import { useViewportMode } from '../../hooks/useViewportMode';
import { IconButton } from '../IconButton';
import styles from './Dialog.module.css';

export type DialogWidth = 640 | 720 | 900;

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  width?: DialogWidth;
  /** When false, Esc and scrim clicks are ignored; the close button still calls onOpenChange(false). */
  dismissible?: boolean;
  /** Takes the whole screen (100dvh, no radius) below the phone breakpoint. */
  fullScreenBelow?: 'phone';
  closeLabel: string;
  /** Rendered before the title, e.g. a "Back" button. */
  leading?: ReactNode;
  /** Header controls placed next to the close button. */
  actions?: ReactNode;
  /** Full-width row under the title, e.g. step pills. */
  headerExtra?: ReactNode;
  /** Element to focus on open instead of the first tabbable one. */
  initialFocus?: RefObject<HTMLElement | null>;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  subtitle,
  width = 640,
  dismissible = true,
  fullScreenBelow,
  closeLabel,
  leading,
  actions,
  headerExtra,
  initialFocus,
  footer,
  className,
  style,
  ref,
  children,
}: DialogProps) {
  const { mode } = useViewportMode();
  const popupRef = useRef<HTMLDivElement>(null);
  const fullScreen = fullScreenBelow === 'phone' && mode === 'phone';
  return (
    <BaseDialog.Root
      open={open}
      disablePointerDismissal={!dismissible}
      onOpenChange={(next, details) => {
        if (!dismissible && details.reason === 'escape-key') {
          details.cancel();
          return;
        }
        onOpenChange(next);
      }}
    >
      <BaseDialog.Portal onFocus={(event) => wrapFocusFromGuard(event, popupRef.current)}>
        <BaseDialog.Backdrop className={styles.backdrop} />
        <BaseDialog.Popup
          ref={(node) => {
            popupRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          className={cx(styles.popup, className)}
          style={{ ...style, '--dialog-width': `${width}px` } as CSSProperties}
          initialFocus={initialFocus}
          data-fullscreen={fullScreen || undefined}
        >
          <header className={styles.header}>
            <div className={styles.headerRow}>
              {leading}
              <div className={styles.heading}>
                <BaseDialog.Title className={styles.title}>{title}</BaseDialog.Title>
                {subtitle && <BaseDialog.Description className={styles.subtitle}>{subtitle}</BaseDialog.Description>}
              </div>
              {actions}
              <BaseDialog.Close render={<IconButton icon="x" label={closeLabel} size={28} />} />
            </div>
            {headerExtra && <div className={styles.headerExtra}>{headerExtra}</div>}
          </header>
          <div className={styles.body}>{children}</div>
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
