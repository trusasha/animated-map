import { useRef, useState } from 'react';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { Menu } from '../Menu';
import { Dialog, type DialogWidth } from './Dialog';

export const title = 'Dialog';

const widths: DialogWidth[] = [640, 720, 900];

export default function Demo() {
  const nameRef = useRef<HTMLInputElement>(null);
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
      <Button variant="secondary" onClick={() => setOpen('noclose')}>
        No close button
      </Button>
      <Button variant="secondary" onClick={() => setOpen('slots')}>
        Header slots
      </Button>
      <Button variant="secondary" onClick={() => setOpen('full')}>
        Full screen on phone
      </Button>

      {widths.map((w) => (
        <Dialog key={w} closeLabel="Close" open={open === `w${w}`} onOpenChange={close} title={`Dialog ${w}`} subtitle="Subtitle explains the purpose.">
          <p>Body copy. Press Esc or click the scrim to close.</p>
          <Button size="sm" variant="secondary">Action</Button>
          <div style={{ height: 900 }} />
          <p>End of scrolling body.</p>
        </Dialog>
      ))}
      <Dialog
        open={open === 'locked'}
        onOpenChange={close}
        closeLabel="Close"
        dismissible={false}
        title="Exporting video"
        subtitle="Esc and scrim clicks are ignored."
        footer={<Button onClick={() => setOpen(null)}>Done</Button>}
      >
        <p>Only the close button and Done dismiss this dialog.</p>
      </Dialog>
      <Dialog
        open={open === 'noclose'}
        onOpenChange={close}
        closeLabel="Close"
        dismissible="escape"
        closeButton={false}
        title="Export video"
        actions={<span>1. Prepare · 2. Captions</span>}
        footer={<Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>}
      >
        <p>No ✕ and no scrim close: Esc or Cancel only.</p>
      </Dialog>
      <Dialog
        open={open === 'slots'}
        onOpenChange={close}
        closeLabel="Close"
        title="Export video"
        subtitle="Header slots and initial focus."
        leading={<IconButton icon="arrow-left" label="Back" size={28} />}
        actions={
          <Menu
            trigger={<IconButton icon="more-horizontal" label="More" size={28} />}
            items={[
              { key: 'a', label: 'Duplicate', onSelect: () => undefined },
              { key: 'b', label: 'Rename', onSelect: () => undefined },
              { key: 'c', label: 'Archive', onSelect: () => undefined },
            ]}
          />
        }
        headerExtra={<div data-testid="slots-extra">Step 1 of 3</div>}
        initialFocus={nameRef}
      >
        <input ref={nameRef} aria-label="Name" defaultValue="Focused on open" />
      </Dialog>
      <Dialog open={open === 'full'} onOpenChange={close} closeLabel="Close" title="Edit figure" fullScreenBelow="phone" width={720}>
        <p>Below 700px this fills the screen with a sticky header.</p>
        <div style={{ height: 900 }} />
      </Dialog>
    </div>
  );
}
