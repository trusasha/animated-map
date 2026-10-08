import assert from 'node:assert/strict';
import { DEFAULT_SPEC, clampHeight, nearestSnap, releaseSnap, snapHeights, stepSnap, toggleSnap } from './snap';

const h = snapHeights(DEFAULT_SPEC, 800);
assert.deepEqual(h, { peek: 120, collapsed: 368, full: 728 });
assert.deepEqual(snapHeights(DEFAULT_SPEC, 100), { peek: 100, collapsed: 100, full: 100 });
assert.deepEqual(snapHeights({ peek: 200, collapsed: 0.1, fullInset: 0 }, 600), { peek: 200, collapsed: 200, full: 600 });

assert.equal(clampHeight(50, h), 120);
assert.equal(clampHeight(900, h), 728);
assert.equal(clampHeight(300, h), 300);

assert.equal(nearestSnap(130, h), 'peek');
assert.equal(nearestSnap(300, h), 'collapsed');
assert.equal(nearestSnap(600, h), 'full');

assert.equal(releaseSnap(200, 0, h), 'peek');
assert.equal(releaseSnap(250, 0.1, h), 'collapsed');
assert.equal(releaseSnap(150, 1, h), 'collapsed');
assert.equal(releaseSnap(400, 1, h), 'full');
assert.equal(releaseSnap(728, 2, h), 'full');
assert.equal(releaseSnap(600, -1, h), 'collapsed');
assert.equal(releaseSnap(300, -1, h), 'peek');
assert.equal(releaseSnap(120, -2, h), 'peek');
assert.equal(releaseSnap(360, -0.4, h), 'collapsed');

assert.equal(toggleSnap('peek'), 'collapsed');
assert.equal(toggleSnap('collapsed'), 'peek');
assert.equal(toggleSnap('full'), 'peek');
assert.equal(stepSnap('peek', 1), 'collapsed');
assert.equal(stepSnap('full', 1), 'full');
assert.equal(stepSnap('peek', -1), 'peek');
assert.equal(stepSnap('full', -1), 'collapsed');

console.log('snap.check ok');
