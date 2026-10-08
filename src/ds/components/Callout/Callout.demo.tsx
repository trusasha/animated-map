import { Callout } from './Callout';

export const title = 'Callout';

export default function Demo() {
  return (
    <div data-testid="demo-Callout" style={{ display: 'grid', gap: 'var(--space-12)', maxWidth: 440 }}>
      <Callout tone="neutral">For the best model, the photo should show one whole object, from the side or at 3/4.</Callout>
      <Callout tone="warning" title="Keep this tab open and visible.">
        Rendering stops if you switch tabs or minimize the window.
      </Callout>
      <Callout tone="info">This turns on with an OpenAI key. Search works without it.</Callout>
    </div>
  );
}
