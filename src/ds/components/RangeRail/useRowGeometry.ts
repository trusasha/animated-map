import { useEffect, useState, type RefObject } from 'react';

export type Geometry = { ys: number[]; tops: number[]; height: number };

const EMPTY: Geometry = { ys: [], tops: [], height: 0 };

/** node y and top of every `[data-idx]` row, relative to the container; re-measured on resize and on row changes */
export function useRowGeometry(containerRef: RefObject<HTMLElement | null>, count: number, nodeY: number): Geometry {
  const [geo, setGeo] = useState<Geometry>(EMPTY);
  useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => measure());
    const measure = () => {
      const base = box.getBoundingClientRect().top - box.scrollTop;
      const rows = Array.from(box.querySelectorAll<HTMLElement>('[data-idx]'));
      rows.forEach((r) => ro.observe(r));
      const tops = rows.map((r) => r.getBoundingClientRect().top - base);
      const next = { ys: tops.map((t) => t + nodeY), tops, height: box.scrollHeight };
      setGeo((p) => (p.height === next.height && p.ys.join() === next.ys.join() ? p : next));
    };
    measure();
    ro.observe(box);
    const mo = new MutationObserver(measure);
    mo.observe(box, { childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [containerRef, count, nodeY]);
  return geo;
}
