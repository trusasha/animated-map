import { useSyncExternalStore } from 'react';

export type Route = { name: 'home' } | { name: 'trip'; id: string };

const CHANGE = 'app:navigate';

export const parseRoute = (path: string): Route => {
  const m = /^\/trip\/([^/]+)\/?$/.exec(path);
  return m ? { name: 'trip', id: decodeURIComponent(m[1]) } : { name: 'home' };
};

export const pathFor = (route: Route) => (route.name === 'trip' ? `/trip/${encodeURIComponent(route.id)}` : '/');

/** keeps the query string so `?e2e` survives navigation */
export function navigate(route: Route, replace = false) {
  const url = pathFor(route) + location.search;
  if (url === location.pathname + location.search) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  window.dispatchEvent(new Event(CHANGE));
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('popstate', onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(CHANGE, onChange);
  };
};

const snapshot = () => location.pathname;

export function useRoute(): Route {
  return parseRoute(useSyncExternalStore(subscribe, snapshot, () => '/'));
}
