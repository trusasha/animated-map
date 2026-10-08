export type ToastTone = 'info' | 'error';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; onAction: () => void };
}

export const MAX_TOASTS = 3;
export const INFO_TIMEOUT_MS = 5500;

export type ToastInput = Omit<ToastItem, 'id'>;

/** Appends a toast, evicting the oldest ones beyond `max`. */
export function pushToast(queue: ToastItem[], item: ToastItem, max = MAX_TOASTS): ToastItem[] {
  return [...queue, item].slice(-max);
}

export function dismissToast(queue: ToastItem[], id: number): ToastItem[] {
  return queue.filter((t) => t.id !== id);
}

/** Auto-dismiss delay in ms, or null for toasts that stay until dismissed. */
export function toastTimeout(tone: ToastTone): number | null {
  return tone === 'error' ? null : INFO_TIMEOUT_MS;
}
