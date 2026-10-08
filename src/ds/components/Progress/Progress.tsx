import type { CSSProperties, Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './Progress.module.css';

export interface ProgressProps {
  /** 0–100. */
  value: number;
  /** Accessible name. */
  label: string;
  size?: 'md' | 'sm';
  /** Show the percentage next to the bar. */
  showValue?: boolean;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function Progress({ value, label, size = 'md', showValue, className, style, ref }: ProgressProps) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div ref={ref} className={cx(styles.root, className)} style={style} data-size={size}>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      {showValue && <span className={styles.value} aria-hidden="true">{pct}%</span>}
    </div>
  );
}
