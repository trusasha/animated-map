import { useLayoutEffect, useState, type RefObject } from 'react';

/** viewport top and height of an element, kept current while it resizes */
export function useElementBox(ref: RefObject<HTMLElement | null>) {
  const [box, setBox] = useState({ top: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox((b) => (b.top === r.top && b.height === r.height ? b : { top: r.top, height: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [ref]);
  return box;
}
