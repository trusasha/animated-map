import { useRef, useState, type PointerEvent } from 'react';
import { clampHeight, releaseSnap, type Snap } from './snap';

const TAP_SLOP = 4;
const VELOCITY_WINDOW = 100;

interface Options {
  heights: Record<Snap, number>;
  height: number;
  onRelease: (snap: Snap) => void;
}

export function useSheetDrag({ heights, height, onRelease }: Options) {
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const start = useRef({ y: 0, height: 0, moved: false });
  const samples = useRef<{ t: number; y: number }[]>([]);
  const suppressClick = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    suppressClick.current = false;
    start.current = { y: e.clientY, height, moved: false };
    samples.current = [{ t: e.timeStamp, y: e.clientY }];
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const dy = start.current.y - e.clientY;
    if (!start.current.moved && Math.abs(dy) < TAP_SLOP) return;
    start.current.moved = true;
    samples.current = [...samples.current.filter((s) => e.timeStamp - s.t < VELOCITY_WINDOW), { t: e.timeStamp, y: e.clientY }];
    setDragHeight(clampHeight(start.current.height + dy, heights));
  };

  const finish = (e: PointerEvent<HTMLElement>, cancelled: boolean) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!start.current.moved) return;
    suppressClick.current = true;
    const first = samples.current[0];
    const dt = e.timeStamp - first.t;
    const velocity = dt > 0 ? (first.y - e.clientY) / dt : 0;
    const final = clampHeight(start.current.height + (start.current.y - e.clientY), heights);
    setDragHeight(null);
    onRelease(cancelled ? releaseSnap(final, 0, heights) : releaseSnap(final, velocity, heights));
  };

  const consumeClick = () => {
    const suppressed = suppressClick.current;
    suppressClick.current = false;
    return suppressed;
  };

  return {
    dragHeight,
    consumeClick,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: PointerEvent<HTMLElement>) => finish(e, false),
      onPointerCancel: (e: PointerEvent<HTMLElement>) => finish(e, true),
    },
  };
}
