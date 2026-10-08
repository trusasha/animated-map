import type { CSSProperties, Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './NumberBadge.module.css';

export type NumberBadgeVariant = 'filled' | 'outline' | 'selected' | 'approximate';

export interface NumberBadgeProps {
  value: number | string;
  /** filled: route ends; outline: middle stops; selected: active endpoint; approximate: dashed warning. */
  variant?: NumberBadgeVariant;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLSpanElement>;
}

export function NumberBadge({ value, variant = 'outline', className, style, ref }: NumberBadgeProps) {
  return (
    <span ref={ref} className={cx(styles.badge, className)} style={style} data-variant={variant}>
      {value}
    </span>
  );
}
