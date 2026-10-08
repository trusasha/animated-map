import { Badge, type BadgeTone } from './Badge';

export const title = 'Badge';

const tones: BadgeTone[] = ['blue', 'neutral', 'success', 'warning'];

export default function Demo() {
  return (
    <div data-testid="demo-Badge" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-12)' }}>
      {tones.map((tone) => <Badge key={tone} tone={tone}>{tone}</Badge>)}
    </div>
  );
}
