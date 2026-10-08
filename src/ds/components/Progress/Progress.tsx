import type { CSSProperties, Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './Progress.module.css';

export interface ProgressProps {
  /** 0–100; ignored when `indeterminate`. */
  value?: number;
  /** Accessible name. */
  label: string;
  size?: 'md' | 'sm';
  /** Unknown duration: animated bar without aria-valuenow. */
  indeterminate?: boolean;
  /** Show the percentage next to the bar. */
  showValue?: boolean;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function Progress({ value = 0, label, size = 'md', indeterminate, showValue, className, style, ref }: ProgressProps) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div ref={ref} className={cx(styles.root, className)} style={style} data-size={size} data-indeterminate={indeterminate || undefined}>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : pct}
      >
        <div className={styles.fill} style={indeterminate ? undefined : { width: `${pct}%` }} />
      </div>
      {showValue && !indeterminate && <span className={styles.value} aria-hidden="true">{pct}%</span>}
    </div>
  );
}
