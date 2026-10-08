import type { ComponentProps, Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './LinkButton.module.css';

export interface LinkButtonProps extends Omit<ComponentProps<'button'>, 'ref' | 'type'> {
  size?: 'sm' | 'md';
  /** Renders an anchor instead of a button. */
  href?: string;
  target?: string;
  rel?: string;
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
}

export function LinkButton({ size = 'md', href, target, rel, className, ref, ...rest }: LinkButtonProps) {
  const classes = cx(styles.link, className);
  if (href && !rest.disabled) {
    return (
      <a
        {...(rest as ComponentProps<'a'>)}
        ref={ref as Ref<HTMLAnchorElement>}
        className={classes}
        data-size={size}
        href={href}
        target={target}
        rel={rel ?? (target === '_blank' ? 'noreferrer' : undefined)}
      />
    );
  }
  return <button {...rest} ref={ref as Ref<HTMLButtonElement>} className={classes} data-size={size} type="button" />;
}
