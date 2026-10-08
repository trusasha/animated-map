import { useEffect, useEffectEvent, useRef, useState, type CSSProperties, type Ref } from 'react';
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
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function Toast({ toast, onDismiss, dismissLabel, className, style, ref }: ToastProps) {
  const { id, tone, message, action } = toast;
  const [paused, setPaused] = useState(false);
  const dismiss = useEffectEvent(onDismiss);
  const remaining = useRef(toastTimeout(tone));

  useEffect(() => {
    const ms = remaining.current;
    if (ms == null || paused) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => dismiss(id), ms);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, ms - (Date.now() - startedAt));
    };
  }, [id, paused]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- the close button is the keyboard path
    <div
      ref={ref}
      style={style}
      className={cx(styles.toast, className)}
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
      onClick={() => onDismiss(id)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={(e) => !e.currentTarget.contains(document.activeElement) && setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && !e.currentTarget.matches(':hover') && setPaused(false)}
    >
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
  /** Extra space above the toasts in `top` placement (px or any CSS length), e.g. to clear map controls. */
  topInset?: number | string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function Toaster({ toasts, onDismiss, dismissLabel, placement = 'bottom', topInset, className, style, ref }: ToasterProps) {
  return (
    <div
      ref={ref}
      style={topInset === undefined ? style : ({ ...style, '--toaster-top-inset': typeof topInset === 'number' ? `${topInset}px` : topInset } as CSSProperties)}
      className={cx(styles.toaster, className)}
      data-placement={placement}
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} dismissLabel={dismissLabel} />
      ))}
    </div>
  );
}
