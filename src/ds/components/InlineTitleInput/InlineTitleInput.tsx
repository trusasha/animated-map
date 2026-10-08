import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';
import styles from './InlineTitleInput.module.css';

export interface InlineTitleInputProps extends Omit<ComponentProps<'input'>, 'size' | 'aria-label'> {
  label: string;
}

export function InlineTitleInput({ label, className, ref, ...rest }: InlineTitleInputProps) {
  return <input {...rest} ref={ref} aria-label={label} className={cx(styles.input, className)} />;
}
