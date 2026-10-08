import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { cx } from '../../lib/cx';
import { clampRange, dragTo, keyStep, nearestHandle, type Handle } from './range';
import styles from './RangeRail.module.css';

export type RangeRailLabels = {
  from: string;
  to: string;
  rowClick: string;
  valueText?: (idx: number, count: number) => string;
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

type Geometry = { ys: number[]; tops: number[]; height: number };

const EMPTY: Geometry = { ys: [], tops: [], height: 0 };

function useRowGeometry(containerRef: RefObject<HTMLElement | null>, count: number, nodeY: number): Geometry {
  const [geo, setGeo] = useState<Geometry>(EMPTY);
  useLayoutEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    const measure = () => {
      const base = box.getBoundingClientRect().top - box.scrollTop;
      const rows = Array.from(box.querySelectorAll<HTMLElement>('[data-idx]'));
      const tops = rows.map((r) => r.getBoundingClientRect().top - base);
      const next = { ys: tops.map((t) => t + nodeY), tops, height: box.scrollHeight };
      setGeo((p) => (p.height === next.height && p.ys.join() === next.ys.join() ? p : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    box.querySelectorAll('[data-idx]').forEach((r) => ro.observe(r));
    const mo = new MutationObserver(measure);
    mo.observe(box, { childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [containerRef, count, nodeY]);
  return geo;
}

const rowAt = (x: number, y: number, tops: number[], boxTop: number): number | null => {
  const hit = document.elementFromPoint(x, y);
  const el = hit?.closest<HTMLElement>('[data-idx]') ?? hit?.closest<HTMLElement>('[data-rail-idx]');
  const raw = el?.dataset.idx ?? el?.dataset.railIdx;
  if (raw !== undefined) return Number(raw);
  if (!tops.length) return null;
  return y - boxTop < tops[0] ? 0 : tops.length - 1;
};

export function RangeRail({ count, from, to, onChange, containerRef, labels, nodeY = 20, className }: RangeRailProps) {
  const { ys, tops, height } = useRowGeometry(containerRef, count, nodeY);
  const rootRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Handle | null>(null);
  const range = clampRange(count, from, to);

  const emit = useCallback(
    (next: { from: number; to: number }) => {
      if (next.from !== range.from || next.to !== range.to) onChange(next.from, next.to);
    },
    [onChange, range.from, range.to],
  );

  if (count < 3 || ys.length < count) return <div ref={rootRef} hidden />;

  const begin = (handle: Handle, e: PointerEvent) => {
    rootRef.current?.setPointerCapture(e.pointerId);
    setDrag(handle);
  };
  const onCell = (idx: number, e: PointerEvent) => {
    if (e.button !== 0) return;
    const handle = nearestHandle(range, idx);
    emit(dragTo(handle, idx, range, count));
    begin(handle, e);
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const boxTop = containerRef.current?.getBoundingClientRect().top ?? 0;
    const idx = rowAt(e.clientX, e.clientY, tops, boxTop);
    if (idx !== null) emit(dragTo(drag, idx, range, count));
  };
  const onKey = (handle: Handle, e: KeyboardEvent) => {
    const next = keyStep(handle, e.key, range, count);
    if (!next) return;
    e.preventDefault();
    emit(next);
  };

  const text = (i: number) => labels.valueText?.(i, count) ?? `${i + 1} / ${count}`;
  const handle = (h: Handle, label: string) => {
    const i = range[h];
    return (
      <div
        role="slider"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={label}
        aria-valuemin={h === 'from' ? 0 : range.from + 1}
        aria-valuemax={h === 'from' ? range.to - 1 : count - 1}
        aria-valuenow={i}
        aria-valuetext={text(i)}
        title={label}
        className={cx(styles.handle, drag === h && styles.dragging)}
        style={{ top: ys[i] }}
        onPointerDown={(e) => {
          e.stopPropagation();
          begin(h, e);
        }}
        onKeyDown={(e) => onKey(h, e)}
      />
    );
  };

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      style={{ height }}
      onPointerMove={onMove}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
    >
      {ys.slice(0, count).map((_, i) => (
        <div key={i} data-rail-idx={i} className={styles.cell} title={labels.rowClick} style={{ top: tops[i], height: (tops[i + 1] ?? height) - tops[i] }} onPointerDown={(e) => onCell(i, e)} />
      ))}
      {ys.slice(0, count - 1).map((y, i) => (
        <span key={i} className={cx(styles.line, i >= range.from && i < range.to && styles.active)} style={{ top: y, height: ys[i + 1] - y }} />
      ))}
      {handle('from', labels.from)}
      {handle('to', labels.to)}
    </div>
  );
}
