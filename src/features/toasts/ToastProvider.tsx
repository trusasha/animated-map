import { useEffect, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Toaster, useToasts as useToastQueue, useViewportMode } from '../../ds';
import { useT } from '../../i18n/react';
import { registerErrorSink } from './reportError';
import { ToastContext } from './useToasts';

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
        <Toaster toasts={toasts} onDismiss={dismiss} dismissLabel={t('common.actions.close')} placement={mode === 'phone' ? 'top' : 'bottom'} />,
        document.body,
      )}
    </ToastContext>
  );
}
