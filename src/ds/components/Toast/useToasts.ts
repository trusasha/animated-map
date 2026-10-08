import { useCallback, useRef, useState } from 'react';
import { dismissToast, pushToast, type ToastInput, type ToastItem } from './queue';

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    setToasts((q) => pushToast(q, { ...input, id }));
    return id;
  }, []);

  const dismiss = useCallback((id: number) => setToasts((q) => dismissToast(q, id)), []);

  return { toasts, push, dismiss };
}
