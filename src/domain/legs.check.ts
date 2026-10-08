import assert from 'node:assert/strict';
import { greatCircle } from './geo';
import { applyColorToAll, changeMode, LINE_PALETTE, legMeta, resetColor, segColor } from './legs';
import { pathKey } from './route';
import { DEFAULT_SETTINGS } from './settings';
import type { CustomModel, Stop, TripData } from './types';

const model = (mode: CustomModel['mode']): CustomModel => ({ id: 'm', name: 'm', url: '/u/m.glb', status: 'ready', task_id: null, mode, pose: null });
const st = (id: string, lng: number, leg?: Stop['leg']): Stop => ({ id, name: id, lng, lat: 0, leg });
const d: TripData = {
  stops: [st('a', 0), st('b', 1, { mode: 'ground', figure: 'car', color: '#112233' }), st('c', 2, { mode: 'air', figure: 'airplane' })],
  style: 'streets', speed: 1, format: '9:16',
};

assert.equal(LINE_PALETTE.length, 8);
assert.ok(LINE_PALETTE.every((c) => /^#[0-9a-f]{6}$/.test(c.color)));
assert.equal(segColor(d.stops[1].leg!), '#112233', 'own colour wins');
assert.equal(segColor(d.stops[2].leg!), DEFAULT_SETTINGS.colors.air, 'mode default otherwise');
assert.equal(segColor(d.stops[2].leg!, { ...DEFAULT_SETTINGS, colors: { ...DEFAULT_SETTINGS.colors, air: '#abcdef' } }), '#abcdef');

const all = applyColorToAll(d, '#ffffff');
assert.deepEqual(all.stops.map((s) => s.leg?.color), [undefined, '#ffffff', '#ffffff']);
assert.equal(all.stops[0].leg, undefined, 'first stop still has no leg');
const reset = resetColor(d, 0);
assert.ok(!('color' in reset.stops[1].leg!), 'colour key removed');
assert.equal(reset.stops[2], d.stops[2], 'other stops untouched');

const own = [model(null)], gone = 'model:/u/other.glb';
assert.equal(changeMode(d.stops[1].leg!, 'ground', []), d.stops[1].leg, 'same mode is a no-op');
assert.deepEqual(changeMode({ mode: 'ground', figure: 'car' }, 'air', []), { mode: 'air', figure: 'airplane' }, 'default figure of the new mode');
assert.equal(changeMode({ mode: 'ground', figure: 'model:/u/m.glb' }, 'air', own).figure, 'model:/u/m.glb', 'own figure that fits both modes stays');
assert.equal(changeMode({ mode: 'ground', figure: 'model:/u/m.glb' }, 'air', [model('ground')]).figure, 'airplane', 'own figure of the old mode goes');
assert.equal(changeMode({ mode: 'ground', figure: gone }, 'water', own).figure, 'ship');
const eager = { ...DEFAULT_SETTINGS, figures: { ...DEFAULT_SETTINGS.figures, water: 'sailboat' } };
assert.equal(changeMode({ mode: 'air', figure: 'airplane' }, 'water', [], eager).figure, 'sailboat', 'settings default is used');
assert.equal(changeMode({ mode: 'air', figure: 'airplane' }, 'water', [], { ...DEFAULT_SETTINGS, figures: { ...DEFAULT_SETTINGS.figures, water: 'model:/u/x.glb' } }).figure, 'ship', 'a missing settings default falls back');
assert.equal(changeMode({ mode: 'air', figure: 'airplane', speed: 2, color: '#000000' }, 'water', []).speed, 2, 'other leg fields kept');

assert.deepEqual(legMeta(d, 0), { building: true, straight: false, pace: null }, 'no path yet');
const built = (path: [number, number][], speed?: number): TripData => {
  const x = { ...d, stops: d.stops.map((s) => ({ ...s, leg: s.leg && { ...s.leg } })) };
  x.stops[1].leg = { ...x.stops[1].leg!, path, speed };
  x.stops[1].leg!.pathKey = pathKey(x, 0);
  return x;
};
assert.deepEqual(legMeta(built(greatCircle([0, 0], [1, 0])), 0), { building: false, straight: true, pace: null }, 'great circle on a road leg = no road');
assert.deepEqual(legMeta(built([[0, 0], [0.5, 0.1], [1, 0]], 1.5), 0), { building: false, straight: false, pace: 1.5 });
const stale = built([[0, 0], [1, 0]]);
stale.stops[1].leg!.pathKey = 'x>y:ground';
assert.equal(legMeta(stale, 0).building, true, 'path of other stops is not valid');

console.log('legs ok');
