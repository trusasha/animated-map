import { useRef, type KeyboardEvent, type RefObject } from 'react';
import { cx } from '../../lib/cx';
import { clampRange, keyStep, nearestHandle, type Handle, type Range } from './range';
import { useRailDrag } from './useRailDrag';
import { useRowGeometry } from './useRowGeometry';
import styles from './RangeRail.module.css';

export type RangeRailLabels = {
  from: string;
  to: string;
  rowClick: string;
  valueText: (idx: number, count: number) => string;
};

export type RangeRailProps = {
  count: number;
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
  containerRef: RefObject<HTMLElement | null>;
  labels: RangeRailLabels;
  nodeY?: number;
  className?: string;
};

export function RangeRail({ count, from, to, onChange, containerRef, labels, nodeY = 20, className }: RangeRailProps) {
  const { ys, tops, height } = useRowGeometry(containerRef, count, nodeY);
  const rootRef = useRef<HTMLDivElement>(null);
  const range = clampRange(count, from, to);
  const emit = (next: Range) => {
    if (next.from !== range.from || next.to !== range.to) onChange(next.from, next.to);
  };
  const { drag, start, handlers } = useRailDrag({ rootRef, containerRef, count, nodeY, range, onCommit: emit });

  if (count < 3 || ys.length < count) return <div ref={rootRef} hidden />;

  const shown = drag?.range ?? range;
  const onKey = (handle: Handle, e: KeyboardEvent) => {
    const next = keyStep(handle, e.key, range, count);
    if (!next) return;
    e.preventDefault();
    emit(next);
  };

  const handle = (h: Handle, label: string) => {
    const i = shown[h];
    return (
      <div
        role="slider"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={label}
        aria-valuemin={h === 'from' ? 0 : shown.from + 1}
        aria-valuemax={h === 'from' ? shown.to - 1 : count - 1}
        aria-valuenow={i}
        aria-valuetext={labels.valueText(i, count)}
        title={label}
        className={cx(styles.handle, drag?.handle === h && styles.dragging)}
        style={{ top: drag?.handle === h ? drag.y : ys[i] }}
        onPointerDown={(e) => {
          e.stopPropagation();
          start(h, e, ys[i] - (e.clientY - rootRef.current!.getBoundingClientRect().top));
        }}
        onKeyDown={(e) => onKey(h, e)}
      />
    );
  };

  return (
    <div ref={rootRef} data-own-drag="" className={cx(styles.root, className)} style={{ height }} {...handlers}>
      {ys.slice(0, count).map((_, i) => (
        <div
          key={i}
          className={styles.cell}
          title={labels.rowClick}
          style={{ top: tops[i], height: (tops[i + 1] ?? height) - tops[i] }}
          onPointerDown={(e) => start(nearestHandle(range, i), e)}
        />
      ))}
      {ys.slice(0, count - 1).map((y, i) => (
        <span key={i} className={cx(styles.line, i >= shown.from && i < shown.to && styles.active)} style={{ top: y, height: ys[i + 1] - y }} />
      ))}
      {handle('from', labels.from)}
      {handle('to', labels.to)}
    </div>
  );
}
