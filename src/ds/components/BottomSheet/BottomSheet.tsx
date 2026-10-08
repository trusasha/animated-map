import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { DEFAULT_SPEC, snapHeights, stepSnap, toggleSnap, type Snap, type SnapSpec } from './snap';
import { useSheetDrag } from './useSheetDrag';
import styles from './BottomSheet.module.css';

export interface BottomSheetProps {
  snap: Snap;
  onSnapChange: (snap: Snap) => void;
  /** Reports the rendered height in px, live while dragging. */
  onHeightChange?: (px: number) => void;
  heights?: Partial<SnapSpec>;
  /** Accessible name of the sheet. */
  label: string;
  grabberLabel?: string;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** Positions itself at the bottom of its nearest positioned ancestor and sizes against that ancestor. */
export function BottomSheet({
  snap,
  onSnapChange,
  onHeightChange,
  heights: spec,
  label,
  grabberLabel = 'Resize panel',
  footer,
  className,
  children,
}: BottomSheetProps) {
  const ref = useRef<HTMLElement>(null);
  const [container, setContainer] = useState(0);
  const { peek, collapsed, fullInset } = { ...DEFAULT_SPEC, ...spec };
  const px = useMemo(() => snapHeights({ peek, collapsed, fullInset }, container), [peek, collapsed, fullInset, container]);
  const target = px[snap];
  const { dragHeight, consumeClick, handlers } = useSheetDrag({ heights: px, height: target, onRelease: onSnapChange });
  const height = dragHeight ?? target;

  useLayoutEffect(() => {
    const parent = ref.current?.offsetParent ?? ref.current?.parentElement;
    if (!parent) return;
    const measure = () => setContainer(parent.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (container > 0) onHeightChange?.(height);
  }, [height, container, onHeightChange]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') onSnapChange(stepSnap(snap, 1));
    else if (e.key === 'ArrowDown') onSnapChange(stepSnap(snap, -1));
    else return;
    e.preventDefault();
  };

  return (
    <section
      ref={ref}
      aria-label={label}
      className={cx(styles.sheet, className)}
      style={{ height: container > 0 ? height : undefined }}
      data-snap={snap}
      data-dragging={dragHeight !== null || undefined}
    >
      <button
        type="button"
        className={styles.grabber}
        aria-label={grabberLabel}
        aria-expanded={snap !== 'peek'}
        onClick={() => !consumeClick() && onSnapChange(toggleSnap(snap))}
        onKeyDown={onKeyDown}
        {...handlers}
      >
        <span className={styles.bar} aria-hidden="true" />
      </button>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region must be keyboard-focusable */}
      <div className={styles.content} role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </section>
  );
}
