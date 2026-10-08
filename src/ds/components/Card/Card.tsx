import type { ComponentProps, ReactNode, Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './Card.module.css';

export type CardVariant = 'floating' | 'flat';

export interface CardProps extends Omit<ComponentProps<'div'>, 'ref'> {
  variant?: CardVariant;
  /** Scrolls its content instead of growing; the parent must bound the height. */
  scroll?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export function Card({ variant = 'floating', scroll, className, ref, ...rest }: CardProps) {
  return <div {...rest} ref={ref} className={cx(styles.card, className)} data-variant={variant} data-scroll={scroll || undefined} />;
}

export interface SectionHeaderProps {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  /** Heading element for the title; pick the level that fits the page outline. */
  as?: 'h2' | 'h3' | 'h4';
  className?: string;
}

export function SectionHeader({ title, meta, action, as: Heading = 'h2', className }: SectionHeaderProps) {
  return (
    <div className={cx(styles.header, className)}>
      <Heading className={styles.title}>{title}</Heading>
      {meta != null && <span className={styles.meta}>{meta}</span>}
      {action != null && <span className={styles.action}>{action}</span>}
    </div>
  );
}
