import assert from 'node:assert/strict';
import { chain, defaultLeg, legsOf, migrate, pathKey, setLegAt } from './route';
import { DEFAULT_SETTINGS } from './settings';
import type { Stop, Trip, TripData } from './types';

const S = (id: string, mode?: string): Stop => ({ id, name: id, lng: 10, lat: 50, ...(mode && { leg: { mode, figure: 'x' } as Stop['leg'] }) });
const data = (stops: Stop[], extra: object = {}) => ({ stops, style: 'streets', speed: 1, format: '9:16', ...extra }) as TripData;
const ok = (d: TripData) => {
  assert.equal(d.stops[0]?.leg, undefined, 'first stop has no leg');
  assert.equal(legsOf(d).length, Math.max(d.stops.length - 1, 0));
  for (const l of legsOf(d)) assert.ok(['air', 'ground', 'water'].includes(l.mode) && typeof l.figure === 'string', JSON.stringify(l));
  assert.equal(new Set(d.stops.map((s) => s.id)).size, d.stops.length, 'unique ids');
};
const modes = (d: TripData) => legsOf(d).map((l) => l.mode).join();

const good = data([S('A'), S('B', 'air'), S('C', 'water')]);
assert.equal(chain(good), good, 'untouched data keeps identity');
ok(chain(data([S('A', 'air'), S('B'), { ...S('C'), leg: null as never }, S('D', 'rocket'), { ...S('E'), leg: { mode: 'air' } as never }])));
ok(chain(data([S('A'), S('A', 'air'), S('A', 'air')])));
ok(chain({ style: 'streets' } as TripData));
assert.equal(modes(chain(data([S('B', 'air'), S('C', 'water')]))), 'water', 'leg stripped from the new first stop only');

assert.equal(chain(data(good.stops, { range: { from: 'A', to: 'X' } })).range, undefined, 'range to a missing stop dropped');
assert.equal(chain(data(good.stops, { range: { from: 'C', to: 'A' } })).range, undefined, 'inverted range dropped');
assert.deepEqual(chain(data(good.stops, { range: { from: 'A', to: 'B' } })).range, { from: 'A', to: 'B' });

const legacy = (d: object) => migrate({ id: 't', title: 't', data: d } as Trip).data;
assert.equal(modes(legacy({ stops: [S('A'), S('B'), S('C')], legs: [{ mode: 'air', figure: 'x' }, { mode: 'water', figure: 'x' }] })), 'air,water');
assert.ok(!('legs' in legacy({ stops: [S('A'), S('B')], legs: [] })));
for (const legs of [null, [], [null], [{ mode: 'air', figure: 'x' }, { mode: 'air', figure: 'x' }, { mode: 'air', figure: 'x' }]]) ok(legacy({ stops: [S('A'), S('B'), S('C')], legs }));
ok(legacy({ stops: [S('A'), { ...S('B'), leg: null }] }));

const near: [number, number] = [10, 50], far: [number, number] = [10, 55], farther: [number, number] = [10, 60];
assert.deepEqual(defaultLeg(near, far), { mode: 'ground', figure: 'car' });
assert.deepEqual(defaultLeg(near, farther), { mode: 'air', figure: 'airplane' });
assert.deepEqual(defaultLeg(near, far, DEFAULT_SETTINGS), defaultLeg(near, far));
const eager = { ...DEFAULT_SETTINGS, flyKm: 100, figures: { air: 'helicopter', ground: 'bus', water: 'ship' } };
assert.deepEqual(defaultLeg(near, far, eager), { mode: 'air', figure: 'helicopter' }, 'flyKm and air figure come from settings');
assert.deepEqual(defaultLeg(near, [10, 50.2], eager), { mode: 'ground', figure: 'bus' }, 'ground figure comes from settings');
assert.deepEqual(chain(data([S('A'), S('B')]), eager).stops[1].leg, { mode: 'ground', figure: 'bus' }, 'chain uses the settings for new legs');
assert.equal(chain(good, eager), good, 'valid legs are never overwritten by settings');

assert.equal(pathKey(good, 1), 'B>C:water');
const recoloured = setLegAt(good, 0, (l) => ({ ...l, color: '#112233' }));
assert.equal(recoloured.stops[1].leg!.color, '#112233');
assert.equal(chain(recoloured), recoloured, 'colour does not break the chain');
assert.ok(!('color' in legacy({ stops: [S('A'), S('B', 'air')] }).stops[1].leg!), 'migrate never backfills colour');
assert.ok(!('sub' in legacy({ stops: [S('A'), S('B', 'air')] }).stops[1]), 'migrate never backfills sub');

console.log('route ok');
