import assert from 'node:assert/strict';
import { addTile, createPins, PIN_CAP, pinnedZoom } from './pins';

const p = createPins();
addTile(p, 14, 100, 200);
addTile(p, 12, 25, 50);
addTile(p, 12, 26, 50);

// MapLibre descends while the returned level is above the node's: 0 → 14 along the planned tile's branch
assert.equal(pinnedZoom(p, 0, 0, 0, 3), 3 + PIN_CAP, 'the cap holds a far view near its own level');
assert.equal(pinnedZoom(p, 0, 0, 0, 13), 14, 'the root asks for the finest level below it');
assert.equal(pinnedZoom(p, 12, 25, 50, 13), 14, 'a planned 12 tile with a 14 inside descends to 14');
assert.equal(pinnedZoom(p, 13, 50, 100, 11), 14, 'within the cap the level does not follow the camera');
assert.equal(pinnedZoom(p, 14, 100, 200, 16), 14, 'nor when the camera would go finer');
assert.equal(pinnedZoom(p, 12, 26, 50, 15), 12, 'a planned leaf stays at its level');
assert.equal(pinnedZoom(p, 13, 51, 101, 15), 13, 'a sibling inside a planned tile stops right there');
assert.equal(pinnedZoom(p, 12, 900, 900, 11.4), 11.4, 'an unplanned place falls back to the camera');

console.log('stable pins ok');
