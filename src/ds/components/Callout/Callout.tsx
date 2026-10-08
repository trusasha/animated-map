import type { ComponentProps, ReactNode, Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './Callout.module.css';

export type CalloutTone = 'neutral' | 'warning' | 'info' | 'error' | 'success';

export interface CalloutProps extends Omit<ComponentProps<'div'>, 'ref' | 'title'> {
  tone?: CalloutTone;
  /** Bold lead-in line. */
  title?: ReactNode;
  /** Announces the callout immediately (role="alert"); use for content that appears after user action. */
  live?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export function Callout({ tone = 'neutral', title, live = false, className, children, ref, ...rest }: CalloutProps) {
  return (
    <div
      role={live ? 'alert' : 'note'}
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
