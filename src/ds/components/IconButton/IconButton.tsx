import type { ComponentProps, Ref } from 'react';
import { cx } from '../../lib/cx';
import { Icon, type IconName, type IconSize } from '../Icon';
import styles from './IconButton.module.css';

export type IconButtonSize = 26 | 28 | 36 | 'touch';

export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'ref' | 'type' | 'children' | 'aria-label'> {
  icon: IconName;
  /** Accessible name and tooltip. */
  label: string;
  size?: IconButtonSize;
  /** Toggled-on look; also exposed as aria-pressed. */
  active?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const glyphSize: Record<IconButtonSize, IconSize> = { 26: 16, 28: 18, 36: 20, touch: 20 };

export function IconButton({ icon, label, size = 26, active, title, className, ref, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      ref={ref}
      className={cx(styles.iconButton, className)}
      type="button"
      data-size={size}
      data-active={active || undefined}
      aria-label={label}
      aria-pressed={active}
      title={title ?? label}
    >
      <Icon name={icon} size={glyphSize[size]} />
    </button>
  );
}
