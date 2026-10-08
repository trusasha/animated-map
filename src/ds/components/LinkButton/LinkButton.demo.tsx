import { LinkButton } from './LinkButton';

export const title = 'LinkButton';

export default function Demo() {
  return (
    <div data-testid="demo-LinkButton" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-16)', alignItems: 'baseline' }}>
      <LinkButton size="md">Use default</LinkButton>
      <LinkButton size="sm">Apply to all segments</LinkButton>
      <LinkButton href="#link">As anchor</LinkButton>
      <LinkButton disabled>Disabled</LinkButton>
    </div>
  );
}
