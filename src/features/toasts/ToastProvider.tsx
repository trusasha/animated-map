import { useEffect, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Toaster, useToasts as useToastQueue, useViewportMode } from '../../ds';
import { useT } from '../../i18n/react';
import { registerErrorSink } from './reportError';
import { ToastContext } from './useToasts';

// below the phone header: back button row plus its padding
const PHONE_HEADER = 'calc(var(--space-48) + env(safe-area-inset-top))';
// narrow enough to stay clear of the map controls in the top-right corner
const PHONE_WIDTH = { width: 'min(440px, calc(100% - 2 * var(--space-56)))' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, push, dismiss } = useToastQueue();
  const { mode } = useViewportMode();
  const { t } = useT();
  const api = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  useEffect(() => {
    registerErrorSink((message) => push({ tone: 'error', message }));
    return () => registerErrorSink(null);
  }, [push]);

  return (
    <ToastContext value={api}>
      {children}
      {createPortal(
        <Toaster toasts={toasts} onDismiss={dismiss} dismissLabel={t('common.actions.close')} placement={mode === 'phone' ? 'top' : 'bottom'} topInset={PHONE_HEADER} style={mode === 'phone' ? PHONE_WIDTH : undefined} />,
        document.body,
      )}
    </ToastContext>
  );
}
