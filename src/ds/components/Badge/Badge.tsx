import type { CSSProperties, ReactNode, Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './Badge.module.css';

export type BadgeTone = 'blue' | 'neutral' | 'success' | 'warning';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLSpanElement>;
}

export function Badge({ tone = 'blue', children, className, style, ref }: BadgeProps) {
  return (
    <span ref={ref} className={cx(styles.badge, className)} style={style} data-tone={tone}>
      {children}
    </span>
  );
}
