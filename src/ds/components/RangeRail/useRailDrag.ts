import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { dragTo, edgeSpeed, nearestRow, type Handle, type Range } from './range';

export type RailDrag = { handle: Handle; range: Range; y: number };

type Live = { handle: Handle; range: Range; startY: number; clientY: number; offset: number; frame: number };

type Options = {
  rootRef: RefObject<HTMLElement | null>;
  containerRef: RefObject<HTMLElement | null>;
  count: number;
  nodeY: number;
  range: Range;
  onCommit: (range: Range) => void;
};

const scrollParent = (el: HTMLElement): HTMLElement => {
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight) return p;
  }
  return document.scrollingElement as HTMLElement;
};

const visible = (box: HTMLElement) => {
  if (box === document.scrollingElement) return { top: 0, bottom: innerHeight };
  const r = box.getBoundingClientRect();
  return { top: Math.max(r.top, 0), bottom: Math.min(r.bottom, innerHeight) };
};

/** Handle drag: rows measured afresh on every move, auto-scroll near the scroller's edges, one commit on release. */
export function useRailDrag({ rootRef, containerRef, count, nodeY, range, onCommit }: Options) {
  const [drag, setDrag] = useState<RailDrag | null>(null);
  const live = useRef<Live | null>(null);

  const track = () => {
    const d = live.current, root = rootRef.current, box = containerRef.current;
    if (!d || !root || !box) return;
    const top = root.getBoundingClientRect().top;
    const ys = Array.from(box.querySelectorAll<HTMLElement>('[data-idx]'), (r) => r.getBoundingClientRect().top - top + nodeY);
    if (ys.length < count) return;
    const y = d.clientY + d.offset - top;
    d.range = dragTo(d.handle, nearestRow(ys, y), d.range, count);
    const [lo, hi] = d.handle === 'from' ? [0, d.range.to - 1] : [d.range.from + 1, count - 1];
    setDrag({ handle: d.handle, range: d.range, y: Math.min(Math.max(y, ys[lo]), ys[hi]) });
  };

  const tick = () => {
    const d = live.current, root = rootRef.current;
    if (!d || !root) return;
    const box = scrollParent(root);
    const { top, bottom } = visible(box);
    const v = edgeSpeed(d.clientY, top, bottom);
    // a handle grabbed inside an edge zone scrolls only once the pointer heads towards that edge
    if (v && Math.sign(v) === Math.sign(d.clientY - d.startY)) {
      const before = box.scrollTop;
      box.scrollTop = before + v;
      if (box.scrollTop !== before) track();
    }
    d.frame = requestAnimationFrame(tick);
  };

  const finish = (keep: boolean) => {
    const d = live.current;
    if (!d) return;
    cancelAnimationFrame(d.frame);
    live.current = null;
    setDrag(null);
    if (keep) onCommit(d.range);
  };

  useEffect(() => () => {
    if (live.current) cancelAnimationFrame(live.current.frame);
  }, []);

  /** `offset` keeps the grabbed point of a handle under the pointer instead of snapping its centre to it */
  const start = (handle: Handle, e: PointerEvent, offset = 0) => {
    const root = rootRef.current;
    if (e.button !== 0 || live.current || !root) return;
    root.setPointerCapture(e.pointerId);
    live.current = { handle, range, startY: e.clientY, clientY: e.clientY, offset, frame: requestAnimationFrame(tick) };
    track();
  };

  const handlers = {
    onPointerMove: (e: PointerEvent) => {
      if (!live.current) return;
      live.current.clientY = e.clientY;
      track();
    },
    onPointerUp: () => finish(true),
    onPointerCancel: () => finish(false),
    onLostPointerCapture: () => finish(true),
  };

  return { drag, start, handlers };
}
