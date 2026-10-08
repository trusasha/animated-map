import { NumberBadge, type NumberBadgeVariant } from './NumberBadge';

export const title = 'NumberBadge';

const variants: NumberBadgeVariant[] = ['filled', 'outline', 'selected', 'approximate'];

export default function Demo() {
  return (
    <div data-testid="demo-NumberBadge" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-16)', alignItems: 'center' }}>
      {variants.map((variant, i) => (
        <div key={variant} style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center', color: 'var(--text-secondary)' }}>
          <NumberBadge value={i + 1} variant={variant} />
          {variant}
        </div>
      ))}
      <NumberBadge value={12} />
    </div>
  );
}
