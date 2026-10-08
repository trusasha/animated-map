import { useState } from 'react';
import { IconButton } from '../IconButton';
import { Menu } from './Menu';

export const title = 'Menu';

export default function Demo() {
  const [last, setLast] = useState('none');
  return (
    <div data-testid="demo-Menu" style={{ display: 'flex', gap: 'var(--space-12)', alignItems: 'center' }}>
      <Menu
        style={{ minWidth: 200 }}
        trigger={<IconButton icon="more-horizontal" label="Stop actions" size={28} />}
        items={[
          { key: 'up', label: 'Move up', icon: 'arrow-up', onSelect: () => setLast('Move up') },
          { key: 'down', label: 'Move down', icon: 'arrow-down', onSelect: () => setLast('Move down') },
          { key: 'map', label: 'Move on map', icon: 'map-pin', disabled: true, onSelect: () => setLast('Move on map') },
          { type: 'separator', key: 's' },
          { key: 'del', label: 'Delete', icon: 'trash-2', danger: true, onSelect: () => setLast('Delete') },
        ]}
      />
      <span>Last: {last}</span>
    </div>
  );
}
