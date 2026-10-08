import { Button } from '../Button';
import { Popover } from './Popover';

export const title = 'Popover';

export default function Demo() {
  return (
    <div data-testid="demo-Popover">
      <Popover trigger={<Button variant="secondary">Route details</Button>} label="Route details" style={{ minWidth: 240 }}>
        <strong>3 stops</strong>
        <p style={{ margin: 'var(--space-4) 0 0', color: 'var(--text-secondary)' }}>Berlin to Rome, about 1,500 km.</p>
      </Popover>
    </div>
  );
}
