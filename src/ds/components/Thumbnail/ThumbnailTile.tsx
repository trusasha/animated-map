import type { ReactNode, Ref } from 'react';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import styles from './Thumbnail.module.css';

export type ThumbnailSize = 40 | 60 | 120;

export interface ThumbnailTileProps {
  /** Resolved image URL; thumbnails are produced by feature hooks, never here. */
  src?: string;
  name: ReactNode;
  sub?: ReactNode;
  size?: ThumbnailSize;
  selected?: boolean;
  disabled?: boolean;
  /** Dashed "add" tile: plus glyph instead of an image. */
  add?: boolean;
  /** Badge or status shown beside the name. */
  badge?: ReactNode;
  /** Actions under a 120 tile (Edit / Delete); lives outside the selectable area. */
  footer?: ReactNode;
  /** Makes the tile selectable; it renders as a button. */
  onSelect?: () => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export function ThumbnailTile({
  src, name, sub, size = 60, selected, disabled, add, badge, footer, onSelect, className, ref,
}: ThumbnailTileProps) {
  const content = (
    <>
      <span className={styles.well}>
        {add ? <Icon name="plus" size={size === 40 ? 16 : 24} /> : src && <img src={src} alt="" draggable={false} />}
      </span>
      <span className={styles.text}>
        <span className={styles.nameRow}>
          <span className={styles.name}>{name}</span>
          {badge}
        </span>
        {sub != null && <span className={styles.sub}>{sub}</span>}
      </span>
    </>
  );
  return (
    <div
      ref={ref}
      className={cx(styles.tile, className)}
      data-size={size}
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
      data-add={add || undefined}
    >
      {onSelect ? (
        <button type="button" className={styles.main} onClick={onSelect} disabled={disabled} aria-pressed={selected}>
          {content}
        </button>
      ) : (
        <div className={styles.main}>{content}</div>
      )}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
