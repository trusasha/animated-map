import { useRef, useState } from 'react';
import { RangeRail } from './RangeRail';

export const title = 'RangeRail';

const STOPS = ['Moscow', 'Istanbul', 'Cairo', 'Nairobi', 'Cape Town', 'Lisbon'];

const listStyle = { position: 'relative', maxWidth: 360, paddingLeft: 'calc(var(--hit-rail) + var(--space-unit))' } as const;
const rowStyle = { display: 'flex', alignItems: 'center', height: 40, color: 'var(--text-body)' } as const;

export default function Demo() {
  const ref = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ from: 1, to: 4 });
  return (
    <div data-testid="demo-RangeRail">
      <div ref={ref} style={listStyle}>
        {STOPS.map((name, i) => (
          <div key={name} data-idx={i} style={rowStyle}>
            {name}
          </div>
        ))}
        <RangeRail
          count={STOPS.length}
          from={range.from}
          to={range.to}
          onChange={(from, to) => setRange({ from, to })}
          containerRef={ref}
          labels={{
            from: 'Drag to change where the video starts',
            to: 'Drag to change where the video ends',
            rowClick: 'Click to move the nearest handle here',
            valueText: (i) => STOPS[i],
          }}
        />
      </div>
      <p className="tabular" style={{ color: 'var(--text-secondary)' }}>
        {STOPS[range.from]} → {STOPS[range.to]}
      </p>
    </div>
  );
}
