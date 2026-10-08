import { useState } from 'react';
import { Button } from '../Button';
import { ConfirmDialog } from './ConfirmDialog';

export const title = 'ConfirmDialog';

export default function Demo() {
  const [open, setOpen] = useState<'default' | 'danger' | null>(null);
  const common = {
    onOpenChange: (next: boolean) => !next && setOpen(null),
    onConfirm: () => setOpen(null),
    cancelLabel: 'Cancel',
  };
  return (
    <div data-testid="demo-ConfirmDialog" style={{ display: 'flex', gap: 'var(--space-8)' }}>
      <Button variant="secondary" onClick={() => setOpen('default')}>
        Confirm
      </Button>
      <Button variant="secondary" onClick={() => setOpen('danger')}>
        Danger confirm
      </Button>
      <ConfirmDialog {...common} open={open === 'default'} title="Start over?" body="The current route stays saved." confirmLabel="Start over" />
      <ConfirmDialog
        {...common}
        open={open === 'danger'}
        tone="danger"
        title="Delete this trip?"
        body="This removes the route and all exported videos. It cannot be undone."
        confirmLabel="Delete trip"
      />
    </div>
  );
}
