import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { cx } from '../../lib/cx';
import { DEFAULT_SPEC, snapHeights, stepSnap, toggleSnap, type Snap, type SnapSpec } from './snap';
import { useContentDrag } from './useContentDrag';
import { useSettledHeight, type HeightInfo } from './useSettledHeight';
import { useSheetDrag } from './useSheetDrag';
import styles from './BottomSheet.module.css';

export interface BottomSheetProps {
  snap: Snap;
  onSnapChange: (snap: Snap) => void;
  /** Reports the rendered height in px, live while dragging; `settled` is true once the snap transition has ended. */
  onHeightChange?: (px: number, info: HeightInfo) => void;
  heights?: Partial<SnapSpec>;
  /** Accessible name of the sheet. */
  label: string;
  /** Accessible name of the scrollable content region. */
  contentLabel: string;
  /** Grabber name while peeking. */
  expandLabel: string;
  /** Grabber name while expanded. */
  collapseLabel: string;
  /** Always-interactive row above the content; the content is inert while peeking. */
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

/** Positions itself at the bottom of its nearest positioned ancestor and sizes against that ancestor. */
export function BottomSheet({
  snap,
  onSnapChange,
  onHeightChange,
  heights: spec,
  label,
  contentLabel,
  expandLabel,
  collapseLabel,
  header,
  footer,
  className,
  style,
  ref: forwardedRef,
  children,
}: BottomSheetProps) {
  const ref = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState(0);
  const { peek, collapsed, fullInset } = { ...DEFAULT_SPEC, ...spec };
  const px = useMemo(() => snapHeights({ peek, collapsed, fullInset }, container), [peek, collapsed, fullInset, container]);
  const target = px[snap];
  const { dragHeight, consumeClick, drag, handlers } = useSheetDrag({ heights: px, height: target, onRelease: onSnapChange });
  const height = dragHeight ?? target;
  const peeking = snap === 'peek';

  useLayoutEffect(() => {
    const parent = ref.current?.offsetParent ?? ref.current?.parentElement;
    if (!parent) return;
    const measure = () => setContainer(parent.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  useSettledHeight(ref, height, container > 0, dragHeight !== null, onHeightChange);
  useContentDrag(contentRef, snap, drag);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') onSnapChange(stepSnap(snap, 1));
    else if (e.key === 'ArrowDown') onSnapChange(stepSnap(snap, -1));
    else return;
    e.preventDefault();
  };

  return (
    <section
      ref={(node) => {
        ref.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      aria-label={label}
      className={cx(styles.sheet, className)}
      style={{ ...style, height: container > 0 ? height : undefined }}
      data-snap={snap}
      data-dragging={dragHeight !== null || undefined}
    >
      <button
        type="button"
        className={styles.grabber}
        aria-label={snap === 'peek' ? expandLabel : collapseLabel}
        onClick={() => !consumeClick() && onSnapChange(toggleSnap(snap))}
        onKeyDown={onKeyDown}
        {...handlers}
      >
        <span className={styles.bar} aria-hidden="true" />
      </button>
      {header && <div className={styles.header}>{header}</div>}
      <div
        ref={contentRef}
        className={styles.content}
        role="region"
        aria-label={contentLabel}
        tabIndex={peeking ? undefined : 0}
        inert={peeking}
      >
        {children}
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </section>
  );
}
