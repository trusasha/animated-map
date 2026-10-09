import { Fragment, useState } from 'react';
import { ListRow } from '../ListRow';
import { NumberBadge } from '../NumberBadge';
import { SortableItem, SortableList, type SortableListLabels } from './SortableList';

export const title = 'SortableList';

const labels: SortableListLabels = {
  instructions: 'Press space to pick up a stop, arrow keys to move it, space to drop, Escape to cancel.',
  announce: (event, id, position) => `${id} ${event === 'cancel' ? 'stays' : event === 'end' ? 'dropped at' : 'at'} position ${position}`,
};

export default function Demo() {
  const [cities, setCities] = useState(['Moscow', 'Istanbul', 'Cairo', 'Nairobi']);
  const move = (from: number, to: number) =>
    setCities((c) => {
      const next = c.slice();
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  return (
    <div data-testid="demo-SortableList" style={{ maxWidth: 360 }}>
      <SortableList ids={cities} onMove={move} labels={labels}>
        {cities.map((name, i) => (
          <Fragment key={name}>
            <SortableItem id={name} handleLabel={`Reorder ${name}`}>
              {(handle) => (
                <ListRow
                  leading={<>{handle}<NumberBadge value={i + 1} variant={i === 0 || i === cities.length - 1 ? 'filled' : 'outline'} /></>}
                  title={name}
                  meta="Drag to reorder"
                />
              )}
            </SortableItem>
            {i < cities.length - 1 && <ListRow compact title={`Leg ${i + 1}`} />}
          </Fragment>
        ))}
      </SortableList>
    </div>
  );
}
