import { Progress } from './Progress';

export const title = 'Progress';

export default function Demo() {
  return (
    <div data-testid="demo-Progress" style={{ display: 'grid', gap: 'var(--space-16)', maxWidth: 320 }}>
      <Progress value={0} label="Loading" showValue />
      <Progress value={42} label="Rendering" showValue />
      <Progress value={100} label="Done" showValue />
      <Progress value={60} label="Overlay preview" size="sm" />
    </div>
  );
}
