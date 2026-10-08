import { useId, type CSSProperties, type ReactNode, type Ref } from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  native?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}

export function Select({ options, value, onChange, label, hint, error, placeholder, native, disabled, id, className, style, ref }: SelectProps) {
  const auto = useId();
  const controlId = id ?? auto;
  const labelId = `${controlId}-label`;
  const noteId = error || hint ? `${controlId}-note` : undefined;
  return (
    <div className={cx(styles.field, className)} style={style}>
      {label && (
        <label id={labelId} htmlFor={controlId} className={styles.label}>
          {label}
        </label>
      )}
      {native ? (
        <div className={styles.nativeWrap}>
          <select
            ref={ref as Ref<HTMLSelectElement>}
            id={controlId}
            className={cx(styles.trigger, styles.native)}
            value={value}
            disabled={disabled}
            aria-describedby={noteId}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onChange(e.target.value)}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={16} className={styles.icon} />
        </div>
      ) : (
        <BaseSelect.Root items={options} value={value} disabled={disabled} onValueChange={(v) => v !== null && onChange(v)}>
          <BaseSelect.Trigger
            ref={ref as Ref<HTMLButtonElement>}
            id={controlId}
            className={styles.trigger}
            aria-labelledby={label ? labelId : undefined}
            aria-describedby={noteId}
            aria-invalid={error ? true : undefined}
          >
            <BaseSelect.Value className={styles.value} placeholder={placeholder} />
            <BaseSelect.Icon className={styles.icon}>
              <Icon name="chevron-down" size={16} />
            </BaseSelect.Icon>
          </BaseSelect.Trigger>
          <BaseSelect.Portal>
            <BaseSelect.Positioner className={styles.positioner} sideOffset={4} alignItemWithTrigger={false}>
              <BaseSelect.Popup className={styles.popup}>
                <BaseSelect.List className={styles.list}>
                  {options.map((o) => (
                    <BaseSelect.Item key={o.value} value={o.value} disabled={o.disabled} className={styles.item}>
                      <BaseSelect.ItemText>{o.label}</BaseSelect.ItemText>
                      <BaseSelect.ItemIndicator className={styles.check}>
                        <Icon name="check" size={16} />
                      </BaseSelect.ItemIndicator>
                    </BaseSelect.Item>
                  ))}
                </BaseSelect.List>
              </BaseSelect.Popup>
            </BaseSelect.Positioner>
          </BaseSelect.Portal>
        </BaseSelect.Root>
      )}
      {(error || hint) && (
        <div id={noteId} className={styles.hint} data-error={error ? '' : undefined}>
          {error || hint}
        </div>
      )}
    </div>
  );
}
