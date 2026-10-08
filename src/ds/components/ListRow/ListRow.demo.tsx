import { useState } from 'react';
import { Badge } from '../Badge';
import { IconButton } from '../IconButton';
import { NumberBadge } from '../NumberBadge';
import { ListRow } from './ListRow';

export const title = 'ListRow';

const trips = [
  { name: 'Berlin to Şile', meta: '4 stops · Air, Water, Land', time: 'Just now' },
  { name: 'Alps loop', meta: 'No stops yet', time: 'Yesterday' },
];

export default function Demo() {
  const [selected, setSelected] = useState(1);
  return (
    <div data-testid="demo-ListRow" style={{ display: 'grid', gap: 'var(--space-16)', maxWidth: 360 }}>
      <div>
        {trips.map((t) => (
          <ListRow key={t.name} title={t.name} meta={t.meta} trailing={t.time} onSelect={() => undefined} />
        ))}
      </div>
      <div>
        {['Moscow', 'Istanbul', 'Cairo', 'Nairobi'].map((name, i) => (
          <ListRow
            key={name}
            leading={<NumberBadge value={i + 1} variant={i === 0 || i === 3 ? 'filled' : 'outline'} />}
            title={name}
            meta={i === 0 ? 'Start' : i === 3 ? 'Finish' : 'Region, Country'}
            trailing={i === 2 ? <Badge tone="warning">Approximate</Badge> : undefined}
            selected={selected === i}
            outOfRange={i === 3}
            onSelect={() => setSelected(i)}
            actions={<><IconButton icon="arrow-up" label="Move up" /><IconButton icon="trash-2" label="Delete stop" /></>}
          />
        ))}
      </div>
    </div>
  );
}
