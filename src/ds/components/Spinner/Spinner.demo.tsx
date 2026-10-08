import { Spinner } from './Spinner';

export const title = 'Spinner';

export default function Demo() {
  return (
    <div data-testid="demo-Spinner" style={{ display: 'flex', gap: 'var(--space-16)', alignItems: 'center', color: 'var(--accent)' }}>
      <Spinner size={16} />
      <Spinner size={20} />
      <Spinner size={24} label="Loading" />
    </div>
  );
}
