import { Icon, iconNames, type IconSize } from './Icon';

export const title = 'Icon';

const sizes: IconSize[] = [16, 18, 20, 24];

export default function Demo() {
  return (
    <div data-testid="demo-Icon" style={{ display: 'grid', gap: 'var(--space-16)' }}>
      {sizes.map((size) => (
        <div key={size} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-12)', color: 'var(--text-secondary)' }}>
          <span style={{ width: 'var(--space-32)' }}>{size}</span>
          {iconNames.map((name) => <Icon key={name} name={name} size={size} />)}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 'var(--space-12)', color: 'var(--accent)' }}>
        <Icon name="check" size={24} label="Done" />
        <Icon name="triangle-alert" size={24} style={{ color: 'var(--text-warning)' }} />
      </div>
    </div>
  );
}
