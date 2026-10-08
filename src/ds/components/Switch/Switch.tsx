import { useId, type CSSProperties, type ReactNode, type Ref } from 'react';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import styles from './Switch.module.css';

export interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: ReactNode;
  sub?: ReactNode;
  locked?: boolean;
  /** Where the track sits: after the label (settings rows) or before it (checklists like export captions). */
  placement?: 'end' | 'start';
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLButtonElement>;
}

export function Switch({ checked, onChange, label, sub, locked = false, placement = 'end', disabled = false, className, style, ref }: SwitchProps) {
  const id = useId();
  const inert = locked || disabled;
  return (
    <label className={cx(styles.row, className)} style={style} data-placement={placement} data-locked={locked ? '' : undefined} data-disabled={disabled ? '' : undefined}>
      <span className={styles.text}>
        <span id={id} className={styles.label}>
          {label}
        </span>
        {sub && <span className={styles.sub}>{sub}</span>}
      </span>
      {locked && <Icon name="lock" size={16} className={styles.lock} />}
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        aria-disabled={inert || undefined}
        className={styles.track}
        onClick={() => !inert && onChange?.(!checked)}
      >
        <span className={styles.knob} />
      </button>
    </label>
  );
}
