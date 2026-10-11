import assert from 'node:assert/strict';
import { groupNear, rangeLabel } from './clusters';

const p = (x: number, y = 0) => ({ x, y });
assert.deepEqual(groupNear([p(0), p(10), p(100)], 26), [[0, 1], [2]]);
assert.deepEqual(groupNear([p(0), p(20), p(40)], 26), [[0, 1, 2]], 'chain joins');
assert.deepEqual(groupNear([p(0), p(10), p(20)], 26, [false, true, false]), [[0, 2], [1]], 'solo stays alone');
assert.equal(rangeLabel([8, 7]), '7–8');
assert.equal(rangeLabel([21, 22, 23]), '21–23');
assert.equal(rangeLabel([26, 1]), '1, 26');
assert.equal(rangeLabel([3, 4, 5, 9]), '3–5, 9');
console.log('clusters ok');
