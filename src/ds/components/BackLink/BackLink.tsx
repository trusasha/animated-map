import type { ComponentProps, Ref } from 'react';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import styles from './BackLink.module.css';

export interface BackLinkProps extends Omit<ComponentProps<'button'>, 'ref' | 'type' | 'children'> {
  label: string;
  ref?: Ref<HTMLButtonElement>;
}

export function BackLink({ label, className, ref, ...rest }: BackLinkProps) {
  return (
    <button {...rest} ref={ref} className={cx(styles.back, className)} type="button">
      <Icon name="arrow-left" size={16} />
      {label}
    </button>
  );
}
