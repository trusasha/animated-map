import type { ReactNode } from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cx } from '../../lib/cx';
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
  closeLabel?: string;
  footer?: ReactNode;
  className?: string;
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
  closeLabel = 'Close',
  footer,
  className,
  children,
}: DialogProps) {
  const { mode } = useViewportMode();
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
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={styles.backdrop} />
        <BaseDialog.Popup
          className={cx(styles.popup, className)}
          style={{ '--dialog-width': `${width}px` } as React.CSSProperties}
          data-fullscreen={fullScreen || undefined}
        >
          <header className={styles.header}>
            <div className={styles.heading}>
              <BaseDialog.Title className={styles.title}>{title}</BaseDialog.Title>
              {subtitle && <BaseDialog.Description className={styles.subtitle}>{subtitle}</BaseDialog.Description>}
            </div>
            <BaseDialog.Close render={<IconButton icon="x" label={closeLabel} size={28} />} />
          </header>
          <div className={styles.body}>{children}</div>
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
