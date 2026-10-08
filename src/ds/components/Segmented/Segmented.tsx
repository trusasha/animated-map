import { useId, type CSSProperties, type ReactNode, type Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './Segmented.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible group name; not rendered visibly. */
  label: ReactNode;
  /** Disables the whole group. */
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function Segmented<T extends string>({ options, value, onChange, label, disabled, className, style, ref }: SegmentedProps<T>) {
  const name = useId();
  const labelId = `${name}-label`;
  return (
    <div ref={ref} role="radiogroup" aria-labelledby={labelId} aria-disabled={disabled || undefined} className={cx(styles.track, className)} style={style}>
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      {options.map((o) => {
        const off = disabled || o.disabled;
        return (
          <label key={o.value} className={styles.option} data-selected={o.value === value ? '' : undefined} data-disabled={off ? '' : undefined}>
            <input
              type="radio"
              name={name}
              className={styles.radio}
              value={o.value}
              checked={o.value === value}
              disabled={off}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}
