import type { ComponentProps, MouseEvent, ReactNode, Ref } from 'react';
import { cx } from '../../lib/cx';
import { Spinner } from '../Spinner';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ComponentProps<'button'>, 'ref' | 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  /** Renders an anchor instead of a button (unless disabled). */
  href?: string;
  target?: string;
  rel?: string;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  href,
  target,
  rel,
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  onClick,
  ref,
  ...rest
}: ButtonProps) {
  const content = (
    <>
      {loading ? <Spinner size={16} /> : icon}
      {children}
      {iconRight}
    </>
  );
  const common = {
    className: cx(styles.button, className),
    'data-variant': variant,
    'data-size': size,
    'data-loading': loading || undefined,
    'aria-busy': loading || undefined,
  };

  if (href && !disabled) {
    const onAnchorClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (loading) event.preventDefault();
      else (onClick as ((e: MouseEvent<HTMLAnchorElement>) => void) | undefined)?.(event);
    };
    return (
      <a
        {...(rest as ComponentProps<'a'>)}
        {...common}
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        target={target}
        rel={rel ?? (target === '_blank' ? 'noreferrer' : undefined)}
        aria-disabled={loading || undefined}
        onClick={onAnchorClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...rest}
      {...common}
      ref={ref as Ref<HTMLButtonElement>}
      type={type}
      disabled={disabled}
      aria-disabled={loading || undefined}
      onClick={(event) => {
        if (loading) event.preventDefault();
        else onClick?.(event);
      }}
    >
      {content}
    </button>
  );
}
