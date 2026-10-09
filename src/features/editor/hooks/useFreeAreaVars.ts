import { useEffect } from 'react';

/** publishes the uncovered map strip on the root, so portalled overlays (toasts) can centre in it */
export function useFreeAreaVars({ left, right }: { left: number; right: number }) {
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--map-free-left', `${left}px`);
    root.setProperty('--map-free-right', `${right}px`);
    return () => {
      root.removeProperty('--map-free-left');
      root.removeProperty('--map-free-right');
    };
  }, [left, right]);
}
