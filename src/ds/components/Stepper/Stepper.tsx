import type { CSSProperties, Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './Stepper.module.css';

export interface StepperProps {
  /** Step labels, e.g. "1. Prepare". */
  steps: string[];
  /** Zero-based index of the current step. */
  current: number;
  /** Single "Step 2 of 4" line instead of pills; phone layouts. */
  compact?: boolean;
  /** Compact text for the current step, e.g. "Step 2 of 4 · Captions". */
  compactLabel?: string;
  /** Accessible name of the list. */
  label: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLOListElement>;
}

export function Stepper({ steps, current, compact, compactLabel, label, className, style, ref }: StepperProps) {
  if (compact) {
    return (
      <p className={cx(styles.compact, className)} style={style} role="status">
        {compactLabel ?? steps[current]}
      </p>
    );
  }
  return (
    <ol ref={ref} className={cx(styles.stepper, className)} style={style} aria-label={label}>
      {steps.map((step, i) => (
        <li
          key={step}
          className={styles.step}
          data-state={i < current ? 'past' : i === current ? 'current' : 'future'}
          aria-current={i === current ? 'step' : undefined}
        >
          {step}
        </li>
      ))}
    </ol>
  );
}
