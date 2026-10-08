import { useState } from 'react';
import { Segmented } from './Segmented';

export const title = 'Segmented';

export default function Demo() {
  const [mode, setMode] = useState<'air' | 'land' | 'water'>('land');
  const [theme, setTheme] = useState('system');
  const [two, setTwo] = useState('a');
  return (
    <div data-testid="demo-Segmented" style={{ display: 'grid', gap: 16, maxWidth: 320 }}>
      <Segmented
        label="Travel by"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'air', label: 'Air' },
          { value: 'land', label: 'Land' },
          { value: 'water', label: 'Water' },
        ]}
      />
      <Segmented
        label="Appearance"
        value={theme}
        onChange={setTheme}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'system', label: 'System' },
        ]}
      />
      <Segmented
        label="Two options, one disabled"
        value={two}
        onChange={setTwo}
        options={[
          { value: 'a', label: 'Fast' },
          { value: 'b', label: 'Precise', disabled: true },
        ]}
      />
    </div>
  );
}
