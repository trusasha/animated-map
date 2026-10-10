import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import type { TripData } from '../../src/domain/types.ts';
import { dbOn } from './index.ts';
import type { Query } from './types.ts';

const pg = new PGlite();
const query: Query = <T,>(sql: string, params?: unknown[]) => pg.query<T>(sql, params);
const db = await dbOn(query);
await dbOn(query); // migrations are idempotent

const data: TripData = { style: 'satellite', speed: 1, format: '16:9', stops: [] };
const model = { name: 'm', url: '/uploads/x.glb', status: 'ready', task_id: null, mode: null };

// rows written before accounts existed, as the local user
const legacyTrip = await db.trips.create(null, 'legacy', data);
const legacyModel = await db.models.create(null, model);
await db.settings.save(null, { theme: 'dark' });

const a = await db.trips.create('user-a', 'A trip', data);
await db.trips.create('user-b', 'B trip', data);

assert.deepEqual((await db.trips.list('user-a')).map((t) => t.title), ['A trip']);
assert.deepEqual((await db.trips.list(null)).map((t) => t.title), ['legacy'], 'auth off sees only unowned rows, as before');
assert.equal(await db.trips.get('user-b', a.id), undefined, "B can't read A's trip");
assert.equal(await db.trips.update('user-b', a.id, 'hijack', data), undefined, "B can't write A's trip");
await db.trips.remove('user-b', a.id);
assert.equal((await db.trips.get('user-a', a.id))?.title, 'A trip', "B can't delete A's trip");

const bModel = await db.models.create('user-b', model);
assert.deepEqual((await db.models.list('user-a')).length, 0);
assert.equal(await db.models.get('user-a', bModel.id), undefined);
assert.equal(await db.models.edit('user-a', bModel.id, { name: 'x', mode: null, pose: null }), undefined);
assert.equal(await db.models.setState('user-a', bModel.id, null, 'failed'), undefined);
await db.models.remove('user-a', bModel.id);
assert.equal((await db.models.get('user-b', bModel.id))?.id, bModel.id);

await db.settings.save('user-a', { lang: 'en' });
assert.equal((await db.settings.get('user-a')).lang, 'en');
assert.equal((await db.settings.get('user-b')).lang, 'ru', 'B gets defaults, not A');
assert.equal((await db.settings.get(null)).theme, 'dark');

assert.equal(await db.claim.claimedBy(), null);
assert.deepEqual(await db.claim.claimLegacy('user-c', 'c@example.com'), { trips: 1, models: 1, settings: 1 });
assert.equal(await db.claim.claimedBy(), 'c@example.com');
assert.deepEqual((await db.trips.list('user-c')).map((t) => t.id), [legacyTrip.id]);
assert.deepEqual((await db.models.list('user-c')).map((m) => m.id), [legacyModel.id]);
assert.equal((await db.settings.get('user-c')).theme, 'dark');
assert.equal((await db.trips.list(null)).length, 0);

await db.trips.create(null, 'later local', data);
assert.equal(await db.claim.claimLegacy('user-c', 'c@example.com'), null, 'claims only once');
assert.equal(await db.claim.claimLegacy('user-a', 'a@example.com'), null);
assert.equal((await db.trips.list(null)).length, 1);

await pg.close();
console.log('ok server scoping');
