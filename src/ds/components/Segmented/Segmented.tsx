import { useId, type CSSProperties, type Ref } from 'react';
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
  label: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function Segmented<T extends string>({ options, value, onChange, label, className, style, ref }: SegmentedProps<T>) {
  const name = useId();
  return (
    <div ref={ref} role="radiogroup" aria-label={label} className={cx(styles.track, className)} style={style}>
      {options.map((o) => (
        <label key={o.value} className={styles.option} data-selected={o.value === value ? '' : undefined} data-disabled={o.disabled ? '' : undefined}>
          <input
            type="radio"
            name={name}
            className={styles.radio}
            value={o.value}
            checked={o.value === value}
            disabled={o.disabled}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
