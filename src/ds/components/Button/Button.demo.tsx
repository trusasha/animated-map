import { Icon } from '../Icon';
import { Button, type ButtonSize, type ButtonVariant } from './Button';

export const title = 'Button';

const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'dark', 'danger'];
const sizes: ButtonSize[] = ['sm', 'md', 'lg'];
const row = { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-12)', alignItems: 'center' } as const;

export default function Demo() {
  return (
    <div data-testid="demo-Button" style={{ display: 'grid', gap: 'var(--space-16)' }}>
      {variants.map((variant) => (
        <div key={variant} style={{ display: 'grid', gap: 'var(--space-8)' }}>
          {sizes.map((size) => (
            <div key={size} style={row}>
              <Button variant={variant} size={size}>{variant} {size}</Button>
              <Button variant={variant} size={size} icon={<Icon name="plus" size={16} />}>Icon</Button>
              <Button variant={variant} size={size} iconRight={<Icon name="arrow-right" size={16} />}>Icon right</Button>
              <Button variant={variant} size={size} href="#link">Link</Button>
              <Button variant={variant} size={size} loading>Loading</Button>
              <Button variant={variant} size={size} disabled>Disabled</Button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
