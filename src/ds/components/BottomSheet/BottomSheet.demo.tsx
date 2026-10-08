import { useState } from 'react';
import { Button } from '../Button';
import { BottomSheet } from './BottomSheet';
import type { Snap } from './snap';

export const title = 'BottomSheet';

const snaps: Snap[] = ['peek', 'collapsed', 'full'];

export default function Demo() {
  const [snap, setSnap] = useState<Snap>('collapsed');
  const [height, setHeight] = useState(0);
  const [settled, setSettled] = useState(true);
  return (
    <div data-testid="demo-BottomSheet" style={{ display: 'grid', gap: 'var(--space-12)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center', flexWrap: 'wrap' }}>
        {snaps.map((s) => (
          <Button key={s} size="sm" variant={s === snap ? 'primary' : 'secondary'} onClick={() => setSnap(s)}>
            {s}
          </Button>
        ))}
        <span data-testid="sheet-height">snap {snap} · {Math.round(height)}px · {settled ? 'settled' : 'moving'}</span>
      </div>
      <div
        style={{
          position: 'relative',
          height: 520,
          maxWidth: 390,
          overflow: 'hidden',
          border: 'var(--border-whisper)',
          borderRadius: 'var(--radius-comfortable)',
          background: 'var(--surface-alt)',
        }}
      >
        <BottomSheet
          snap={snap}
          onSnapChange={setSnap}
          onHeightChange={(px, info) => {
            setHeight(px);
            setSettled(info.settled);
          }}
          label="Route"
          contentLabel="Route stops"
          expandLabel="Expand panel"
          collapseLabel="Collapse panel"
          header={<strong>Route · 4 stops</strong>}
          footer={<Button size="sm">Export</Button>}
        >
          <Button size="sm" variant="ghost">Add stop</Button>
          {Array.from({ length: 12 }, (_, i) => (
            <p key={i} style={{ margin: 'var(--space-8) 0 0', color: 'var(--text-secondary)' }}>
              Stop {i + 1}
            </p>
          ))}
        </BottomSheet>
      </div>
    </div>
  );
}
