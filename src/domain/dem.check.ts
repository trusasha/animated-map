import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clampBathymetry } from './dem';

const fixture = JSON.parse(readFileSync(new URL('../../e2e/fixtures/baselines/dem-clamp.json', import.meta.url), 'utf8'));
const buf = new Uint8ClampedArray(fixture.input);
assert.equal(clampBathymetry(buf), buf, 'clamps in place');
assert.deepEqual(Array.from(buf), fixture.output, 'matches the pre-refactor clamp');
assert.deepEqual(Array.from(clampBathymetry(new Uint8ClampedArray([127, 9, 9, 255, 128, 9, 9, 255]))), [128, 0, 0, 255, 128, 9, 9, 255]);

console.log('dem ok');
