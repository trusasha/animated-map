import { useEffect, useRef, type RefObject } from 'react';
import { TAP_SLOP } from './useSheetDrag';
import type { Snap } from './snap';

interface Drag {
  begin: (y: number, t: number) => void;
  move: (y: number, t: number) => void;
  end: (y: number, t: number, cancelled: boolean) => void;
}

/** Touch drag that starts inside the scrolling content: pull down at scrollTop 0, or pull up before full. */
export function useContentDrag(content: RefObject<HTMLElement | null>, snap: Snap, drag: Drag) {
  const latest = useRef({ snap, drag });
  latest.current = { snap, drag };

  useEffect(() => {
    const el = content.current;
    if (!el) return;
    let startY = 0;
    let tracking = false;
    let active = false;
    let lastY = 0;

    const onStart = (e: TouchEvent) => {
      tracking = e.touches.length === 1;
      active = false;
      startY = lastY = e.touches[0]!.clientY;
    };
    const onMove = (e: TouchEvent) => {
      const y = e.touches[0]!.clientY;
      const { snap: current, drag: d } = latest.current;
      if (tracking && !active) {
        const dy = y - startY;
        const pullDown = dy > TAP_SLOP && el.scrollTop <= 0;
        const pullUp = dy < -TAP_SLOP && current !== 'full';
        if (!pullDown && !pullUp) return;
        active = true;
        d.begin(startY, e.timeStamp);
      }
      if (!active) return;
      e.preventDefault();
      lastY = y;
      d.move(y, e.timeStamp);
    };
    const onEnd = (e: TouchEvent) => {
      if (active) latest.current.drag.end(lastY, e.timeStamp, e.type === 'touchcancel');
      tracking = false;
      active = false;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [content]);
}
