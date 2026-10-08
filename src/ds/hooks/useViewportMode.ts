import { useSyncExternalStore } from 'react';

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

const listeners = new Set<() => void>();
let forced = false;
let started = false;

const matches = (q: string) => window.matchMedia(q).matches;

const getSnapshot = (): string =>
  `${matches(QUERIES.desktop) ? 'desktop' : matches(QUERIES.tablet) ? 'tablet' : 'phone'}|${matches(QUERIES.coarse) || forced ? 1 : 0}`;

const getServerSnapshot = () => 'desktop|0';

function writeAttributes() {
  const [mode, coarse] = getSnapshot().split('|');
  const root = document.documentElement;
  root.dataset.mode = mode;
  if (coarse === '1') root.dataset.coarse = '';
  else delete root.dataset.coarse;
}

function notify() {
  writeAttributes();
  listeners.forEach((l) => l());
}

// the single writer of html[data-mode] / html[data-coarse]; started by the first hook use and never torn down
function start() {
  if (started) return;
  started = true;
  Object.values(QUERIES).forEach((q) => window.matchMedia(q).addEventListener('change', notify));
  writeAttributes();
}

/** Forces the coarse tokens on (gallery toggle); a real coarse pointer stays coarse regardless. */
export function forceCoarse(on: boolean) {
  forced = on;
  if (started) notify();
}

const subscribe = (onChange: () => void) => {
  start();
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

export function useViewportMode(): { mode: ViewportMode; coarse: boolean } {
  const [mode, coarse] = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).split('|');
  return { mode: mode as ViewportMode, coarse: coarse === '1' };
}
