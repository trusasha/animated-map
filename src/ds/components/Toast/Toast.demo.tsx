import { useState } from 'react';
import { Button } from '../Button';
import { Toaster, type ToastPlacement } from './Toast';
import { useToasts } from './useToasts';

export const title = 'Toast';

export default function Demo() {
  const { toasts, push, dismiss } = useToasts();
  const [placement, setPlacement] = useState<ToastPlacement>('bottom');
  return (
    <div data-testid="demo-Toast" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-8)' }}>
      <Button variant="secondary" size="sm" onClick={() => push({ tone: 'info', message: 'Route replaced with 4 stops.' })}>
        Info toast
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => push({ tone: 'info', message: 'Stop deleted.', action: { label: 'Undo', onAction: () => undefined } })}
      >
        With Undo
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => push({ tone: 'error', message: 'Couldn’t find a route in that. Name the places in the order you visited them.' })}
      >
        Error toast
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setPlacement(placement === 'bottom' ? 'top' : 'bottom')}>
        Placement: {placement}
      </Button>
      <Toaster toasts={toasts} onDismiss={dismiss} dismissLabel="Dismiss" placement={placement} />
    </div>
  );
}
