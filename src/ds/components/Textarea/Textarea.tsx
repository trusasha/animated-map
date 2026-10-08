import { useId, type ComponentProps, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Textarea.module.css';

export interface TextareaProps extends ComponentProps<'textarea'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export function Textarea({ label, hint, error, rows = 4, id, className, style, ref, ...rest }: TextareaProps) {
  const auto = useId();
  const areaId = id ?? auto;
  const noteId = error || hint ? `${areaId}-note` : undefined;
  return (
    <div className={cx(styles.field, className)} style={style}>
      {label && (
        <label htmlFor={areaId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea
        {...rest}
        ref={ref}
        id={areaId}
        rows={rows}
        className={styles.area}
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
