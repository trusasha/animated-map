import type { ComponentProps, ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './ChoiceCard.module.css';

export interface ChoiceCardProps extends Omit<ComponentProps<'input'>, 'type' | 'size' | 'children'> {
  label: ReactNode;
  sub?: ReactNode;
}

export function ChoiceCard({ label, sub, className, style, ref, ...rest }: ChoiceCardProps) {
  return (
    <label className={cx(styles.card, className)} style={style} data-selected={rest.checked ? '' : undefined} data-disabled={rest.disabled ? '' : undefined}>
      <input {...rest} ref={ref} type="radio" className={styles.radio} />
      <span className={styles.label}>{label}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </label>
  );
}
