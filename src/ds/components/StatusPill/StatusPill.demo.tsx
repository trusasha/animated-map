import { StatusPill } from './StatusPill';
import { Button } from '../Button';

export const title = 'StatusPill';

export default function Demo() {
  return (
    <div data-testid="demo-StatusPill" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-12)' }}>
      <StatusPill busy>Building route…</StatusPill>
      <StatusPill tone="info" action={<Button variant="ghost" size="sm">Cancel</Button>}>
        Click the map to place Istanbul
      </StatusPill>
    </div>
  );
}
