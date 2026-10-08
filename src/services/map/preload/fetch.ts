import type { TilePlan } from './plan';

const FETCH_PARALLEL = 24;
export const TILE_TIMEOUT_MS = 10_000;

/** download progress of one timeline's tiles; `buffered` = timeline seconds fully cached, -1 = none */
export interface Prefetch<T = unknown> { tl: T; buffered: number }

/**
 * fetches the plan's URLs in order with a fixed number of workers; `buffered` only advances over the contiguous
 * done prefix. `alive` turning false stops the workers.
 */
export function fetchTiles<T>(pf: Prefetch<T>, duration: number, { times, cuts, urls }: TilePlan, alive: () => boolean, signal?: AbortSignal, timeoutMs = TILE_TIMEOUT_MS) {
  const done = new Uint8Array(urls.length);
  let next = 0, prefix = 0, k = -1;
  if (!urls.length && alive()) pf.buffered = duration;
  const worker = async () => {
    while (next < urls.length && alive()) {
      const i = next++;
      // a missing tile (404 over open sea etc.) is fine, MapLibre will skip it too; a hung one would stall
      // `buffered` (it only advances over a contiguous done prefix), so give up on it after a while
      const timeout = AbortSignal.timeout(timeoutMs);
      try { await (await fetch(urls[i], { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })).arrayBuffer(); } catch { /* skip */ }
      done[i] = 1;
      while (prefix < urls.length && done[prefix]) prefix++;
      while (k + 1 < cuts.length && cuts[k + 1] <= prefix) k++;
      pf.buffered = prefix === urls.length ? duration : k < 0 ? -1 : times[k];
    }
  };
  return Promise.all(Array.from({ length: FETCH_PARALLEL }, worker)).then(() => undefined);
}
