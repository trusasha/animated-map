import assert from 'node:assert/strict';
import { fitView } from './fitView';

const pad = { top: 60, bottom: 60, left: 390, right: 400 };
// a 1° × 1° box near Japan in a 1700×1070 window: the free area is 910×950, the box is wider than tall in mercator
const v = fitView([[133, 33], [134, 34]], 1700, 1070, pad, 13);
assert.ok(Math.abs(v.center[0] - 133.5) < 1e-9);
assert.ok(v.center[1] > 33.49 && v.center[1] < 33.51);
const pxWide = (1 / 360) * 512 * 2 ** v.zoom;
assert.ok(pxWide <= 910 + 1e-6, 'fits the free width');
assert.equal(fitView([[133, 33], [133.0001, 33.0001]], 1700, 1070, pad, 13).zoom, 13, 'maxZoom caps a tiny box');
console.log('fitView ok');
