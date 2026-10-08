import { useState } from 'react';
import { ChoiceCard } from './ChoiceCard';

export const title = 'ChoiceCard';

const FORMATS = [
  { value: '9:16', label: '9:16', sub: 'Reels · TikTok' },
  { value: '4:5', label: '4:5', sub: 'Instagram post' },
  { value: '1:1', label: '1:1', sub: 'Square' },
  { value: '16:9', label: '16:9', sub: 'YouTube', disabled: true },
];

export default function Demo() {
  const [format, setFormat] = useState('9:16');
  return (
    <div
      data-testid="demo-ChoiceCard"
      role="radiogroup"
      aria-label="Format"
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 320 }}
    >
      {FORMATS.map((f) => (
        <ChoiceCard
          key={f.value}
          name="demo-format"
          value={f.value}
          label={f.label}
          sub={f.sub}
          disabled={f.disabled}
          checked={format === f.value}
          onChange={() => setFormat(f.value)}
        />
      ))}
    </div>
  );
}
