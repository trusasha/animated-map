import assert from 'node:assert/strict';
import { fetchTiles, type Prefetch } from './fetch';

const requested: string[] = [];
globalThis.fetch = ((url: string, init?: RequestInit) => {
  requested.push(url);
  if (url === 'hung') return new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)));
  if (url === 'missing') return Promise.reject(new TypeError('404'));
  return Promise.resolve(new Response('tile'));
}) as typeof fetch;

// AbortSignal.timeout's timer doesn't keep node alive
const keepAlive = setInterval(() => {}, 1000);
const plan = { times: [0, 1, 2, 3], cuts: [1, 2, 3, 4], urls: ['a', 'hung', 'missing', 'b'] };
const pf: Prefetch<string> = { tl: 'tl', buffered: -1 };
const started = Date.now();
await fetchTiles(pf, 3.5, plan, () => true, undefined, 50);
assert.equal(pf.buffered, 3.5, 'a hung tile times out and a missing one is skipped, so buffering completes');
assert.ok(Date.now() - started < 2000, 'gives up on the hung tile after the timeout');
assert.deepEqual([...requested].sort(), ['a', 'b', 'hung', 'missing']);

const pf2: Prefetch<string> = { tl: 'tl', buffered: -1 };
await fetchTiles(pf2, 3.5, { ...plan, urls: ['a', 'hung', 'b', 'b2'] }, () => false, undefined, 50);
assert.equal(pf2.buffered, -1, 'a dead prefetch fetches nothing');

const pf3: Prefetch<string> = { tl: 'tl', buffered: -1 };
await fetchTiles(pf3, 3.5, { times: [], cuts: [], urls: [] }, () => true);
assert.equal(pf3.buffered, 3.5, 'an empty plan is fully buffered');

clearInterval(keepAlive);
console.log('preload fetch ok');
