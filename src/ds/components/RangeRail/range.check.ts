import assert from 'node:assert/strict';
import { clampRange, dragTo, keyStep, nearestHandle } from './range';

assert.deepEqual(clampRange(6, -2, 99), { from: 0, to: 5 });
assert.deepEqual(clampRange(6, 4, 2), { from: 4, to: 5 });
assert.deepEqual(clampRange(6, 5, 5), { from: 4, to: 5 });
assert.deepEqual(clampRange(3, 1.4, 1.6), { from: 1, to: 2 });

const r = { from: 1, to: 4 };
assert.equal(nearestHandle(r, 0), 'from');
assert.equal(nearestHandle(r, 2), 'from');
assert.equal(nearestHandle(r, 3), 'to');
assert.equal(nearestHandle(r, 5), 'to');

assert.deepEqual(dragTo('from', 3, r, 6), { from: 3, to: 4 });
assert.deepEqual(dragTo('from', 5, r, 6), { from: 3, to: 4 });
assert.deepEqual(dragTo('to', 0, r, 6), { from: 1, to: 2 });
assert.deepEqual(dragTo('to', 5, r, 6), { from: 1, to: 5 });

assert.deepEqual(keyStep('from', 'ArrowDown', r, 6), { from: 2, to: 4 });
assert.deepEqual(keyStep('from', 'ArrowUp', r, 6), { from: 0, to: 4 });
assert.deepEqual(keyStep('to', 'ArrowUp', { from: 1, to: 2 }, 6), { from: 1, to: 2 });
assert.deepEqual(keyStep('to', 'PageDown', r, 6), { from: 1, to: 5 });
assert.deepEqual(keyStep('from', 'PageDown', r, 6), { from: 3, to: 4 });
assert.deepEqual(keyStep('from', 'Home', r, 6), { from: 0, to: 4 });
assert.deepEqual(keyStep('to', 'End', r, 6), { from: 1, to: 5 });
assert.deepEqual(keyStep('to', 'Home', r, 6), { from: 1, to: 2 });
assert.equal(keyStep('from', 'Enter', r, 6), null);

console.log('range ok');
