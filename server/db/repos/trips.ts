import { homePoints, tripSummary } from '../../../src/domain/trips.ts';
import type { Trip } from '../../../src/domain/types.ts';
import type { Query, TripsRepo } from '../types.ts';

const COLS = 'id, title, data, updated_at';
const MINE = 'user_id is not distinct from $1::text';

export const tripsRepo = (query: Query): TripsRepo => ({
  list: async (owner) =>
    (await query<Trip & { updated_at: string }>(`select id, title, data, updated_at from trips where ${MINE} order by updated_at desc`, [owner])).rows.map((r) => ({
      id: r.id, title: r.title, updated_at: r.updated_at, summary: tripSummary(r.data), points: homePoints(r.data),
    })),
  get: async (owner, id) => (await query<Trip>(`select ${COLS} from trips where ${MINE} and id = $2`, [owner, id])).rows[0],
  create: async (owner, title, data) =>
    (await query<Trip>(`insert into trips (user_id, title, data) values ($1, $2, $3::jsonb) returning ${COLS}`, [owner, title, JSON.stringify(data)])).rows[0],
  update: async (owner, id, title, data) =>
    (await query<Trip>(`update trips set title = $3, data = $4::jsonb, updated_at = now() where ${MINE} and id = $2 returning ${COLS}`, [owner, id, title, JSON.stringify(data)])).rows[0],
  remove: async (owner, id) => { await query(`delete from trips where ${MINE} and id = $2`, [owner, id]); },
});
