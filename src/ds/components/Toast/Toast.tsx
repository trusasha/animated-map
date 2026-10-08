import { useEffect } from 'react';
import { cx } from '../../lib/cx';
import { IconButton } from '../IconButton';
import { Button } from '../Button';
import { toastTimeout, type ToastItem } from './queue';
import styles from './Toast.module.css';

export type ToastPlacement = 'top' | 'bottom';

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: number) => void;
  /** Accessible name of the dismiss button. */
  dismissLabel: string;
}

export function Toast({ toast, onDismiss, dismissLabel }: ToastProps) {
  const { id, tone, message, action } = toast;

  useEffect(() => {
    const ms = toastTimeout(tone);
    if (ms == null) return;
    const timer = setTimeout(() => onDismiss(id), ms);
    return () => clearTimeout(timer);
  }, [id, tone, onDismiss]);

  return (
    <div className={styles.toast} data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      <span className={styles.message}>{message}</span>
      {action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            action.onAction();
            onDismiss(id);
          }}
        >
          {action.label}
        </Button>
      )}
      <IconButton
        icon="x"
        label={dismissLabel}
        size={26}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(id);
        }}
      />
    </div>
  );
}

export interface ToasterProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
  dismissLabel: string;
  /** Top on phone (below the map controls), bottom elsewhere. */
  placement?: ToastPlacement;
  className?: string;
}

export function Toaster({ toasts, onDismiss, dismissLabel, placement = 'bottom', className }: ToasterProps) {
  return (
    <div className={cx(styles.toaster, className)} data-placement={placement} aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} dismissLabel={dismissLabel} />
      ))}
    </div>
  );
}
