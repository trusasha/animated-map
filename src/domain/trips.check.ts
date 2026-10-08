import assert from 'node:assert/strict';
import { removeStop, moveStop, moveStopTo, homePoints, isDefaultTripName, rangeWasReset, relativeTimeBucket, span, suggestTripName, tripSummary } from './trips';
import { legsOf } from './route';
import type { Stop, TripData } from './types';

const st = (id: string, lng = 0, mode?: 'air' | 'ground' | 'water'): Stop => ({ id, name: id.toUpperCase(), lng, lat: 0, ...(mode && { leg: { mode, figure: 'x', path: [[0, 0]], pathKey: `k${id}` } }) });
const trip = (extra: Partial<TripData> = {}): TripData => ({
  stops: [st('a', 0), st('b', 1, 'air'), st('c', 2, 'ground'), st('d', 3, 'water')], style: 'streets', speed: 1, format: '9:16', ...extra,
});
const ids = (d: TripData) => d.stops.map((s) => s.id).join('');

assert.deepEqual(span(trip()), [0, 3]);
assert.deepEqual(span(trip({ range: { from: 'b', to: 'c' } })), [1, 2]);
assert.deepEqual(span(trip({ range: { from: 'c', to: 'b' } })), [0, 3], 'bad range = whole route');
assert.deepEqual(span({ ...trip(), stops: [] }), [0, 0]);

assert.deepEqual(tripSummary(trip()), { stops: 4, modes: ['air', 'ground', 'water'] });
assert.deepEqual(tripSummary(trip({ stops: [st('a'), st('b', 1, 'water'), st('c', 2, 'water')] })), { stops: 3, modes: ['water'] });
assert.deepEqual(tripSummary({ ...trip(), stops: [] }), { stops: 0, modes: [] });
assert.deepEqual(homePoints(trip()), [[0, 0], [1, 0], [2, 0], [3, 0]]);

const now = Date.parse('2026-10-08T12:00:00Z'), ago = (ms: number) => new Date(now - ms).toISOString();
assert.deepEqual(relativeTimeBucket(ago(5_000), now), { unit: 'now' });
assert.deepEqual(relativeTimeBucket(ago(5 * 60_000), now), { unit: 'minutes', n: 5 });
assert.deepEqual(relativeTimeBucket(ago(3 * 3_600_000 + 1), now), { unit: 'hours', n: 3 });
assert.deepEqual(relativeTimeBucket(ago(30 * 3_600_000), now), { unit: 'yesterday' });
assert.equal(relativeTimeBucket(ago(5 * 86_400_000), now).unit, 'date');
assert.deepEqual(relativeTimeBucket('not a date', now), { unit: 'now' });

for (const n of ['Моё путешествие', 'Новое путешествие', ' new trip ', 'My trip', '']) assert.ok(isDefaultTripName(n), n);
assert.ok(!isDefaultTripName('Лето в Крыму'));
assert.equal(suggestTripName([{ name: 'Berlin' }, { name: 'Istanbul' }, { name: 'Şile' }]), 'Berlin → Şile');
assert.equal(suggestTripName([{ name: 'Berlin' }]), '');

const rm = removeStop(trip(), 2);
assert.equal(ids(rm), 'abd');
assert.equal(legsOf(rm).length, 2, 'chain intact');
assert.equal(rm.stops[2].leg!.mode, 'water', 'neighbour keeps its own leg');
assert.equal(ids(removeStop(trip(), 0)), 'bcd');
assert.equal(removeStop(trip(), 0).stops[0].leg, undefined, 'new first stop has no leg');
const ranged = trip({ range: { from: 'b', to: 'd' } });
assert.deepEqual(removeStop(ranged, 2).range, { from: 'b', to: 'd' }, 'range kept while it stays valid');
assert.equal(removeStop(ranged, 3).range, undefined, 'range end removed');
assert.ok(rangeWasReset(ranged, removeStop(ranged, 3)));
assert.equal(removeStop(trip({ stops: trip().stops.slice(0, 3), range: { from: 'a', to: 'c' } }), 1).range, undefined, 'under 3 stops');
assert.ok(!rangeWasReset(trip(), removeStop(trip(), 1)));

const mv = moveStop(trip(), 1, 1);
assert.equal(ids(mv), 'acbd');
assert.deepEqual(mv.stops.map((s) => s.leg?.mode), [undefined, 'air', 'ground', 'water'], 'legs keep their positions');
assert.equal(ids(moveStop(trip(), 1, -1)), 'bacd');
assert.deepEqual(moveStop(trip(), 1, -1).stops.map((s) => s.leg?.mode), [undefined, 'air', 'ground', 'water'], 'swap with the first stop keeps the leg');
assert.equal(moveStop(trip(), 0, -1).stops.length, 4, 'out of bounds is a no-op');
const edge = trip();
assert.equal(moveStop(edge, 3, 1), edge);

const withSub = trip({ stops: trip().stops.map((s) => ({ ...s, sub: 'x', approx: true })) });
const to = moveStopTo(withSub, 1, [9, 8]);
assert.deepEqual([to.stops[1].lng, to.stops[1].lat, to.stops[1].approx], [9, 8, undefined]);
assert.ok(!('sub' in to.stops[1]), 'stale subtitle dropped');
assert.deepEqual(to.stops.map((s) => s.leg?.pathKey), [undefined, undefined, undefined, 'kd'], 'both touching legs re-route');
assert.equal(to.stops[3], withSub.stops[3]);
assert.equal(moveStopTo(trip(), 0, [5, 5]).stops[1].leg!.pathKey, undefined, 'first stop: only its outgoing leg exists');

console.log('trips ok');
