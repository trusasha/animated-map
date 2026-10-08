import type { ComponentProps, ReactNode, Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './Callout.module.css';

export type CalloutTone = 'neutral' | 'warning' | 'info';

export interface CalloutProps extends Omit<ComponentProps<'div'>, 'ref' | 'title'> {
  tone?: CalloutTone;
  /** Bold lead-in line. */
  title?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function Callout({ tone = 'neutral', title, className, children, ref, ...rest }: CalloutProps) {
  return (
    <div
      role={tone === 'warning' ? 'alert' : 'note'}
      {...rest}
      ref={ref}
      className={cx(styles.callout, className)}
      data-tone={tone}
    >
      {title != null && <strong className={styles.title}>{title} </strong>}
      {children}
    </div>
  );
}
