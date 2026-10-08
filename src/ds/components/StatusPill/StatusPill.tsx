import type { CSSProperties, ReactNode, Ref } from 'react';
import { cx } from '../../lib/cx';
import { Spinner } from '../Spinner';
import styles from './StatusPill.module.css';

export type StatusPillTone = 'neutral' | 'info';

export interface StatusPillProps {
  tone?: StatusPillTone;
  /** Shows a spinner, e.g. "Building route…". */
  busy?: boolean;
  children: ReactNode;
  /** Trailing control, typically a ghost sm Button ("Cancel"). */
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function StatusPill({ tone = 'neutral', busy, children, action, className, style, ref }: StatusPillProps) {
  return (
    <div ref={ref} role="status" className={cx(styles.pill, className)} style={style} data-tone={tone}>
      {busy && <Spinner size={16} />}
      <span className={styles.text}>{children}</span>
      {action}
    </div>
  );
}
