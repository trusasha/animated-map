import { useId, type ComponentProps, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Input.module.css';

export interface InputProps extends Omit<ComponentProps<'input'>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  size?: 'md' | 'search';
}

export function Input({ label, hint, error, size = 'md', id, className, style, ref, ...rest }: InputProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const noteId = error || hint ? `${inputId}-note` : undefined;
  return (
    <div className={cx(styles.field, className)} style={style}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        {...rest}
        ref={ref}
        id={inputId}
        className={styles.input}
        data-size={size}
        aria-invalid={error ? true : undefined}
        aria-describedby={noteId}
      />
      {(error || hint) && (
        <div id={noteId} className={styles.note} data-error={error ? '' : undefined}>
          {error || hint}
        </div>
      )}
    </div>
  );
}
