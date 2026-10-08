import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { legsOf, migrate } from './route';
import type { Stop, Trip } from './types';

const read = (p: string) => JSON.parse(readFileSync(new URL(`../../e2e/fixtures/${p}.json`, import.meta.url), 'utf8'));
const recorded: Record<string, Trip> = read('baselines/migrate');
const names = Object.keys(recorded);
assert.ok(names.length > 0, 'migrate.json records at least one trip');

const clone = <T>(x: T): T => structuredClone(x);
const legacyKeys = (t: Trip) => t.data.stops.flatMap((s) => ['color', 'sub'].filter((k) => k in s));

for (const name of names) {
  const input: Trip = read(`trips/${name}`);
  const before = clone(input);
  const out = migrate(input);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), recorded[name], `${name}: migrate output matches the recorded baseline`);
  assert.deepEqual(input, before, `${name}: migrate does not mutate its input`);
  assert.deepEqual(migrate(out), out, `${name}: migrate is idempotent`);
  assert.deepEqual(legacyKeys(out), [], `${name}: no color/sub keys on stops`);
  assert.ok(legsOf(out.data).every((l) => !('color' in l) && !('sub' in l)), `${name}: no color/sub keys on legs`);
  assert.ok(!('legs' in out.data), `${name}: top-level legs folded away`);
}

const chained: Trip = read('trips/trip-chained');
assert.equal(migrate(chained).data.stops, chained.data.stops, 'already-chained stops keep identity');
assert.deepEqual(migrate(chained), chained, 'already-chained trip is unchanged');

const stop = (id: string, extra: Partial<Stop> = {}): Stop => ({ id, name: id, lng: 10 + id.length, lat: 50, ...extra });
const leg = (mode: string) => ({ mode, figure: 'x' }) as Stop['leg'];
const realistic = {
  id: 'r',
  title: 'realistic legacy',
  data: {
    stops: [stop('a', { leg: leg('air') }), stop('b'), stop('c', { leg: null as never }), stop('b'), stop('d'), stop('e')],
    legs: [leg('water'), null, leg('air')],
    style: 'streets',
    speed: 1,
    format: '9:16',
  },
} as unknown as Trip;

const out = migrate(realistic);
assert.equal(out.data.stops.length, 6, 'stops are preserved');
assert.equal(out.data.stops[0].leg, undefined, 'first stop has no leg');
assert.equal(legsOf(out.data).length, 5, 'every other stop has a leg');
for (const l of legsOf(out.data)) assert.ok(['air', 'ground', 'water'].includes(l.mode) && typeof l.figure === 'string', JSON.stringify(l));
assert.equal(new Set(out.data.stops.map((s) => s.id)).size, 6, 'ids are unique');
assert.equal(out.data.stops[1].leg?.mode, 'water', 'top-level leg 0 lands on stop 1');
assert.equal(out.data.stops[3].leg?.mode, 'air', 'top-level leg 2 lands on stop 3');
assert.ok(!('legs' in out.data), 'top-level legs removed');
assert.deepEqual(migrate(out), out, 'realistic case is idempotent');
