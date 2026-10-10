import { useRef, useState } from 'react';
import { RangeRail } from './RangeRail';

export const title = 'RangeRail';

const STOPS = [
  'Moscow', 'Istanbul', 'Cairo', 'Nairobi', 'Cape Town', 'Lisbon', 'Reykjavík', 'Oslo',
  'Helsinki', 'Tallinn', 'Riga', 'Vilnius', 'Warsaw', 'Prague', 'Vienna', 'Budapest',
];

const scrollStyle = { maxWidth: 360, maxHeight: 320, overflowY: 'auto', padding: '0 var(--space-8)', border: 'var(--border-whisper)', borderRadius: 'var(--radius-standard)' } as const;
const listStyle = { position: 'relative', paddingLeft: 'calc(var(--hit-rail) + var(--space-unit))' } as const;
const rowStyle = { display: 'flex', alignItems: 'flex-start', paddingTop: 10, color: 'var(--text-body)' } as const;

export default function Demo() {
  const ref = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ from: 1, to: 4 });
  return (
    <div data-testid="demo-RangeRail">
      <div style={scrollStyle}>
        <div ref={ref} style={listStyle}>
          {STOPS.map((name, i) => (
            <div key={name} data-idx={i} style={{ ...rowStyle, height: i % 3 === 2 ? 64 : 40 }}>
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
      </div>
      <p className="tabular" style={{ color: 'var(--text-secondary)' }}>
        {STOPS[range.from]} → {STOPS[range.to]}
      </p>
    </div>
  );
}
