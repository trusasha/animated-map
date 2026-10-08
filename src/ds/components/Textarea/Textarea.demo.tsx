import { Textarea } from './Textarea';

export const title = 'Textarea';

export default function Demo() {
  return (
    <div data-testid="demo-Textarea" style={{ display: 'grid', gap: 16, maxWidth: 360 }}>
      <Textarea label="Describe your trip" placeholder="Berlin, then a flight to Istanbul…" hint="Type it or say it." />
      <Textarea label="Two rows" rows={2} defaultValue="Short note" />
      <Textarea label="With error" error="Name at least two places." defaultValue="Somewhere" />
      <Textarea label="Disabled" disabled defaultValue="Turns on with a key." />
    </div>
  );
}
