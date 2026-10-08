import { useState } from 'react';
import { Button } from '../Button';
import { Dialog, type DialogWidth } from './Dialog';

export const title = 'Dialog';

const widths: DialogWidth[] = [640, 720, 900];

export default function Demo() {
  const [open, setOpen] = useState<string | null>(null);
  const close = (next: boolean) => !next && setOpen(null);
  return (
    <div data-testid="demo-Dialog" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-8)' }}>
      {widths.map((w) => (
        <Button key={w} variant="secondary" onClick={() => setOpen(`w${w}`)}>
          Open {w}
        </Button>
      ))}
      <Button variant="secondary" onClick={() => setOpen('locked')}>
        Not dismissible
      </Button>
      <Button variant="secondary" onClick={() => setOpen('full')}>
        Full screen on phone
      </Button>

      {widths.map((w) => (
        <Dialog key={w} open={open === `w${w}`} onOpenChange={close} title={`Dialog ${w}`} subtitle="Subtitle explains the purpose.">
          <p>Body copy. Press Esc or click the scrim to close.</p>
          <div style={{ height: 600 }} />
          <p>End of scrolling body.</p>
        </Dialog>
      ))}
      <Dialog
        open={open === 'locked'}
        onOpenChange={close}
        title="Exporting video"
        subtitle="Esc and scrim clicks are ignored."
        footer={<Button onClick={() => setOpen(null)}>Done</Button>}
      >
        <p>Only the close button and Done dismiss this dialog.</p>
      </Dialog>
      <Dialog open={open === 'full'} onOpenChange={close} title="Edit figure" fullScreenBelow="phone" width={720}>
        <p>Below 700px this fills the screen with a sticky header.</p>
        <div style={{ height: 900 }} />
      </Dialog>
    </div>
  );
}
