import assert from 'node:assert/strict';
import { stretchAt } from './stretch';
import type { Timeline } from './types';

const leg = (start: number, end: number) => ({ start, end }) as Timeline['legs'][number];
const tl = { legs: [leg(2, 6), leg(7, 10)], duration: 13, overview: { zoom: 3, center: [0, 0] } } as Timeline;

assert.deepEqual(stretchAt(tl, 1.9), { kind: 'intro' });
assert.deepEqual(stretchAt(tl, 2), { kind: 'leg', index: 0 });
assert.deepEqual(stretchAt(tl, 6.4), { kind: 'leg', index: 0 }, 'the first half of a swap stays with the leg before');
assert.deepEqual(stretchAt(tl, 6.5), { kind: 'leg', index: 1 }, 'the second half goes to the leg after');
assert.deepEqual(stretchAt(tl, 10), { kind: 'leg', index: 1 });
assert.deepEqual(stretchAt(tl, 10.1), { kind: 'outro' });

console.log('stretch ok');
