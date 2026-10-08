import type { CSSProperties, Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: 16 | 20 | 24;
  /** Accessible name; without it the spinner is decorative. */
  label?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLSpanElement>;
}

export function Spinner({ size = 16, label, className, style, ref }: SpinnerProps) {
  return (
    <span
      ref={ref}
      className={cx(styles.spinner, className)}
      style={style}
      data-size={size}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
