import { useState } from 'react';
import { Input } from './Input';

export const title = 'Input';

export default function Demo() {
  const [value, setValue] = useState('Berlin');
  return (
    <div data-testid="demo-Input" style={{ display: 'grid', gap: 16, maxWidth: 320 }}>
      <Input label="Trip name" value={value} onChange={(e) => setValue(e.target.value)} hint="Shown in the video." />
      <Input label="Empty" placeholder="Placeholder" />
      <Input label="With error" defaultValue="??" error="Enter a name of at least 3 letters." />
      <Input label="Disabled" defaultValue="Locked" disabled />
      <Input size="search" aria-label="Search places" placeholder="Search a place" />
    </div>
  );
}
