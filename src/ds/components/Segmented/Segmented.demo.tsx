import { useState } from 'react';
import { Segmented } from './Segmented';

export const title = 'Segmented';

export default function Demo() {
  const [mode, setMode] = useState<'air' | 'land' | 'water'>('land');
  const [theme, setTheme] = useState('system');
  const [skip, setSkip] = useState('a');
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
        label="Three options, middle disabled"
        value={skip}
        onChange={setSkip}
        options={[
          { value: 'a', label: 'Fast' },
          { value: 'b', label: 'Precise', disabled: true },
          { value: 'c', label: 'Balanced' },
        ]}
      />
      <Segmented
        label="Whole group disabled"
        value="air"
        onChange={() => undefined}
        disabled
        options={[
          { value: 'air', label: 'Air' },
          { value: 'land', label: 'Land' },
        ]}
      />
    </div>
  );
}
