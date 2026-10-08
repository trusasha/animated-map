import { useState } from 'react';
import { Switch } from './Switch';

export const title = 'Switch';

export default function Demo() {
  const [name, setName] = useState(true);
  const [segment, setSegment] = useState(false);
  return (
    <div data-testid="demo-Switch" style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
      <Switch label="Trip name" checked={name} onChange={setName} />
      <Switch label="Segment label" sub="from → to" checked={segment} onChange={setSegment} />
      <Switch label="Map attribution" sub="Always on, required by the map license" checked locked />
      <Switch label="Disabled off" checked={false} disabled />
      <Switch placement="start" label="Progress bar" checked={name} onChange={setName} />
      <Switch placement="start" label="Map attribution" sub="Always on" checked locked />
    </div>
  );
}
