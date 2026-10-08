import assert from 'node:assert/strict';
import { modeFor } from './useViewportMode.ts';

assert.equal(modeFor(699), 'phone');
assert.equal(modeFor(700), 'tablet');
assert.equal(modeFor(1099), 'tablet');
assert.equal(modeFor(1100), 'desktop');
assert.equal(modeFor(320), 'phone');
assert.equal(modeFor(1440), 'desktop');
console.log('useViewportMode.check ok');
