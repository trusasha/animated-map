import { useState } from 'react';
import { Select } from './Select';

export const title = 'Select';

const FIGURES = [
  { value: 'plane', label: 'Paper plane' },
  { value: 'train', label: 'Steam train' },
  { value: 'boat', label: 'Wooden boat' },
  { value: 'bike', label: 'Bicycle', disabled: true },
];

export default function Demo() {
  const [a, setA] = useState('train');
  const [b, setB] = useState('plane');
  return (
    <div data-testid="demo-Select" style={{ display: 'grid', gap: 16, maxWidth: 320 }}>
      <Select label="Figure" hint="Shows up on matching segments." options={FIGURES} value={a} onChange={setA} />
      <Select label="Figure (native, 16px for phones)" native options={FIGURES} value={b} onChange={setB} />
      <Select label="With placeholder" placeholder="Choose a figure" options={FIGURES} value="" onChange={() => {}} />
      <Select label="With error" error="Pick a figure for this segment." options={FIGURES} value="" onChange={() => {}} placeholder="Choose a figure" />
      <Select label="Disabled" options={FIGURES} value="boat" onChange={() => {}} disabled />
    </div>
  );
}
