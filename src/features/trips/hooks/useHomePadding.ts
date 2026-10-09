import { useEffect, type RefObject } from 'react';
import type { HomeGlobe } from '../types';

const ZERO = { top: 0, bottom: 0, left: 0, right: 0 };

/** keeps the globe centred and sized in the map area the Home column (or the phone card) leaves free */
export function useHomePadding(globe: HomeGlobe | undefined, column: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = column.current;
    const area = el?.parentElement;
    if (!globe || !el || !area) return;
    const ro = new ResizeObserver(() => {
      const w = area.clientWidth;
      const card = el.offsetLeft <= 0 && el.offsetWidth >= w - 1;
      const pad = card ? { ...ZERO, bottom: el.offsetHeight } : { ...ZERO, left: el.offsetLeft + el.offsetWidth };
      globe.setHomePadding(pad);
      globe.setControlsInset(card ? { top: 0, bottom: 0, right: 0 } : { bottom: 0, right: 0 });
    });
    ro.observe(el);
    ro.observe(area);
    return () => { ro.disconnect(); globe.setPadding(ZERO); globe.setControlsInset({ bottom: 0, right: 0 }); };
  }, [globe, column]);
}
