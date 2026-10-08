import { useEffect, useEffectEvent, type RefObject } from 'react';

export interface HeightInfo {
  /** False while dragging or while the snap transition is still running. */
  settled: boolean;
}

/** Reports the sheet height; `settled` flips true once the height transition has ended. */
export function useSettledHeight(
  sheet: RefObject<HTMLElement | null>,
  height: number,
  ready: boolean,
  dragging: boolean,
  onHeightChange?: (px: number, info: HeightInfo) => void,
) {
  const report = useEffectEvent((px: number, info: HeightInfo) => onHeightChange?.(px, info));

  useEffect(() => {
    const el = sheet.current;
    if (!ready || !el) return;
    report(height, { settled: false });
    if (dragging) return;
    const settle = () => report(height, { settled: true });
    const onEnd = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === 'height') settle();
    };
    const duration = parseFloat(getComputedStyle(el).transitionDuration) * 1000 || 0;
    const timer = setTimeout(settle, duration + 80);
    el.addEventListener('transitionend', onEnd);
    return () => {
      clearTimeout(timer);
      el.removeEventListener('transitionend', onEnd);
    };
  }, [sheet, height, ready, dragging]);
}
