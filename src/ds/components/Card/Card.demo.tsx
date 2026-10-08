import { Card, SectionHeader } from './Card';
import { LinkButton } from '../LinkButton';

export const title = 'Card';

const body = { padding: 'var(--space-16)', display: 'grid', gap: 'var(--space-12)' } as const;

export default function Demo() {
  return (
    <div data-testid="demo-Card" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-16)' }}>
      {(['floating', 'flat'] as const).map((variant) => (
        <Card key={variant} variant={variant} style={{ width: 280 }}>
          <div style={body}>
            <SectionHeader title="Route" meta="4 stops" action={<LinkButton>Describe with AI</LinkButton>} />
            <span style={{ fontSize: 'var(--type-ui-size)', color: 'var(--text-secondary)' }}>{variant} card</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
