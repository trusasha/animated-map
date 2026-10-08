import type { ComponentProps, Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './Thumbnail.module.css';

export interface ThumbnailGridProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** 3 equal columns, or as many 200px+ columns as fit. */
  columns?: 3 | 'auto';
  ref?: Ref<HTMLDivElement>;
}

export function ThumbnailGrid({ columns = 'auto', className, ref, ...rest }: ThumbnailGridProps) {
  return <div {...rest} ref={ref} className={cx(styles.grid, className)} data-columns={columns} />;
}
