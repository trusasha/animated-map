import { IconButton, type IconButtonSize } from './IconButton';

export const title = 'IconButton';

const sizes: IconButtonSize[] = [26, 28, 36, 'touch'];

export default function Demo() {
  return (
    <div data-testid="demo-IconButton" style={{ display: 'grid', gap: 'var(--space-12)' }}>
      {sizes.map((size) => (
        <div key={size} style={{ display: 'flex', gap: 'var(--space-12)', alignItems: 'center' }}>
          <IconButton icon="settings" label="Settings" size={size} />
          <IconButton icon="settings" label="Settings (active)" size={size} active />
          <IconButton icon="settings" label="Settings (disabled)" size={size} disabled />
        </div>
      ))}
      {/* @ts-expect-error label is required */}
      <IconButton icon="x" hidden />
    </div>
  );
}
