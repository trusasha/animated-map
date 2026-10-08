import { useRef, type CSSProperties, type ReactNode, type Ref, type RefObject } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { cx } from '../../lib/cx';
import { wrapFocusFromGuard } from '../../lib/focusGuard';
import { Button } from '../Button';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'default' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  /** Element to focus on open instead of the first tabbable one. */
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  loading,
  onConfirm,
  initialFocus,
  className,
  style,
  ref,
}: ConfirmDialogProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal onFocus={(event) => wrapFocusFromGuard(event, popupRef.current)}>
        <AlertDialog.Backdrop className={styles.backdrop} />
        <AlertDialog.Popup
          ref={(node) => {
            popupRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          className={cx(styles.popup, className)}
          style={style}
          initialFocus={initialFocus}
        >
          <AlertDialog.Title className={styles.title}>{title}</AlertDialog.Title>
          {body && <AlertDialog.Description className={styles.body}>{body}</AlertDialog.Description>}
          <div className={styles.actions}>
            <AlertDialog.Close render={<Button variant="ghost" />}>{cancelLabel}</AlertDialog.Close>
            <Button
              variant={tone === 'danger' ? 'danger' : 'primary'}
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
