import { useEffect, type RefObject } from 'react';
import type { HomeGlobe } from '../types';

const ZERO = { top: 0, bottom: 0, left: 0, right: 0 };

/** keeps the globe centred in the map area the Home column leaves free */
export function useHomePadding(globe: HomeGlobe | undefined, column: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = column.current;
    if (!globe || !el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const sheet = r.left <= 0 && r.width >= window.innerWidth - 1;
      globe.setPadding(sheet ? { ...ZERO, bottom: r.height } : { ...ZERO, left: r.right });
    });
    ro.observe(el);
    return () => { ro.disconnect(); globe.setPadding(ZERO); };
  }, [globe, column]);
}
