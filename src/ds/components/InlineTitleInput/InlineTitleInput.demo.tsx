import { useState } from 'react';
import { InlineTitleInput } from './InlineTitleInput';

export const title = 'InlineTitleInput';

export default function Demo() {
  const [name, setName] = useState('Berlin to Istanbul');
  return (
    <div data-testid="demo-InlineTitleInput" style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
      <InlineTitleInput label="Trip name" value={name} onChange={(e) => setName(e.target.value)} />
      <InlineTitleInput label="Empty trip name" placeholder="Untitled trip" defaultValue="" />
      <InlineTitleInput label="Disabled trip name" defaultValue="Read only" disabled />
    </div>
  );
}
