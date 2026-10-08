import { Stepper } from './Stepper';

export const title = 'Stepper';

const steps = ['1. Prepare', '2. Captions', '3. Render', '4. Done'];

export default function Demo() {
  return (
    <div data-testid="demo-Stepper" style={{ display: 'grid', gap: 'var(--space-16)' }}>
      <Stepper steps={steps} current={1} label="Export progress" />
      <Stepper steps={steps} current={1} compact compactLabel="Step 2 of 4" label="Export progress" />
    </div>
  );
}
