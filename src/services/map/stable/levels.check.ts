import assert from 'node:assert/strict';
import { shareFinerLevels } from './levels';

const all = () => true;
assert.deepEqual(shareFinerLevels([{ sat: 13 }, { sat: 12 }, { sat: 11 }], all), [{ sat: 13 }, { sat: 13 }, { sat: 13 }], 'a run of road legs ends at its finest level');
assert.deepEqual(shareFinerLevels([{ sat: 13 }, undefined, { sat: 11 }], all), [{ sat: 13 }, undefined, { sat: 11 }], 'an air leg breaks the run');
assert.deepEqual(
  shareFinerLevels([{ sat: 13 }, { sat: 12 }, { sat: 11 }], (i, l) => i !== 1 || l.sat <= 12),
  [{ sat: 13 }, { sat: 12 }, { sat: 12 }],
  'a leg over budget keeps its level and still passes its own to the next',
);
assert.deepEqual(shareFinerLevels([{ sat: 12, dem: 11 }, { sat: 13, dem: 10 }], all), [{ sat: 13, dem: 11 }, { sat: 13, dem: 11 }], 'per source');

console.log('shared leg levels ok');
