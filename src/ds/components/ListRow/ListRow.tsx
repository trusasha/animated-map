import type { ComponentProps, ReactNode, Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './ListRow.module.css';

export interface ListRowProps extends Omit<ComponentProps<'div'>, 'ref' | 'title'> {
  leading?: ReactNode;
  title: ReactNode;
  /** Second line under the title. */
  meta?: ReactNode;
  /** Always-visible end content: relative time, chevron, badge. */
  trailing?: ReactNode;
  /** End actions; revealed on hover/focus (or always when `actionsVisible`, e.g. touch or picking). */
  actions?: ReactNode;
  actionsVisible?: boolean;
  /** Touch fallback: a menu node (trigger included) shown instead of `actions` on coarse pointers, so every action stays reachable without hover. */
  actionsMenu?: ReactNode;
  selected?: boolean;
  /** Outside the video range: dimmed to .45. */
  outOfRange?: boolean;
  /** Renders the main area as a button. */
  onSelect?: () => void;
  ref?: Ref<HTMLDivElement>;
}

export function ListRow({
  leading, title, meta, trailing, actions, actionsVisible, actionsMenu, selected, outOfRange, onSelect, className, ref, ...rest
}: ListRowProps) {
  const body = (
    <>
      {leading != null && <span className={styles.leading}>{leading}</span>}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {meta != null && <span className={styles.meta}>{meta}</span>}
      </span>
      {trailing != null && <span className={styles.trailing}>{trailing}</span>}
    </>
  );
  return (
    <div
      {...rest}
      ref={ref}
      className={cx(styles.row, className)}
      data-selected={selected || undefined}
      data-out-of-range={outOfRange || undefined}
      data-actions-visible={actionsVisible || undefined}
      data-has-menu={actionsMenu != null || undefined}
    >
      {onSelect ? (
        <button type="button" className={styles.main} onClick={onSelect} aria-pressed={selected}>
          {body}
        </button>
      ) : (
        <div className={styles.main}>{body}</div>
      )}
      {actions != null && <span className={styles.actions}>{actions}</span>}
      {actionsMenu != null && <span className={styles.menu}>{actionsMenu}</span>}
    </div>
  );
}
