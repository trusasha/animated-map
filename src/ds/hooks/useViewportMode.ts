import { useEffect, useSyncExternalStore } from 'react';

export type ViewportMode = 'phone' | 'tablet' | 'desktop';

export const TABLET_MIN = 700;
export const DESKTOP_MIN = 1100;

export const modeFor = (width: number): ViewportMode =>
  width < TABLET_MIN ? 'phone' : width < DESKTOP_MIN ? 'tablet' : 'desktop';

const QUERIES = {
  tablet: `(min-width: ${TABLET_MIN}px)`,
  desktop: `(min-width: ${DESKTOP_MIN}px)`,
  coarse: '(pointer: coarse)',
} as const;

const subscribe = (onChange: () => void) => {
  const lists = Object.values(QUERIES).map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener('change', onChange));
  return () => lists.forEach((l) => l.removeEventListener('change', onChange));
};

const matches = (q: string) => window.matchMedia(q).matches;

const getSnapshot = (): string =>
  `${matches(QUERIES.desktop) ? 'desktop' : matches(QUERIES.tablet) ? 'tablet' : 'phone'}|${matches(QUERIES.coarse) ? 1 : 0}`;

const getServerSnapshot = () => 'desktop|0';

export function useViewportMode(): { mode: ViewportMode; coarse: boolean } {
  const [mode, coarse] = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).split('|');

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.mode = mode;
    if (coarse === '1') root.dataset.coarse = '';
    else delete root.dataset.coarse;
  }, [mode, coarse]);

  return { mode: mode as ViewportMode, coarse: coarse === '1' };
}
