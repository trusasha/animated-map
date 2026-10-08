import { useState } from 'react';
import { Slider } from './Slider';

export const title = 'Slider';

export default function Demo() {
  const [speed, setSpeed] = useState(1.5);
  const [length, setLength] = useState(12);
  const [odd, setOdd] = useState(7.3);
  return (
    <div data-testid="demo-Slider" style={{ display: 'grid', gap: 20, maxWidth: 320 }}>
      <Slider
        label="Pace"
        value={speed}
        onChange={setSpeed}
        min={0.5}
        max={3}
        step={0.25}
        format={(v) => `×${v}`}
        startLabel="Slower"
        endLabel="Faster"
        help="How fast the figure travels along this segment."
      />
      <Slider label="Length" value={length} onChange={setLength} min={5} max={60} step={1} format={(v) => `${v} s`} />
      <Slider label="Off-step value (7.3, step 1)" value={odd} onChange={setOdd} min={0} max={10} format={(v) => `${v}`} />
      <Slider label="Disabled" value={40} onChange={() => {}} disabled format={(v) => `${v}%`} />
    </div>
  );
}
