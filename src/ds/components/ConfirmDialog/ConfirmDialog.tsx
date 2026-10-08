import type { ReactNode } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { cx } from '../../lib/cx';
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
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={styles.backdrop} />
        <AlertDialog.Popup className={styles.popup}>
          <AlertDialog.Title className={styles.title}>{title}</AlertDialog.Title>
          {body && <AlertDialog.Description className={styles.body}>{body}</AlertDialog.Description>}
          <div className={styles.actions}>
            <AlertDialog.Close render={<Button variant="ghost" />}>{cancelLabel}</AlertDialog.Close>
            <Button
              className={cx(tone === 'danger' && styles.danger)}
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
