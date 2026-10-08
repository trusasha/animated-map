import { IconButton } from '../IconButton';
import { Tooltip } from './Tooltip';

export const title = 'Tooltip';

export default function Demo() {
  return (
    <div data-testid="demo-Tooltip" style={{ display: 'flex', gap: 'var(--space-12)', padding: 'var(--space-16) 0' }}>
      <Tooltip content="Settings">
        <IconButton icon="settings" label="Settings" size={28} title="" />
      </Tooltip>
      <Tooltip content="Below" side="bottom" delay={0}>
        <IconButton icon="download" label="Download" size={28} title="" />
      </Tooltip>
    </div>
  );
}
