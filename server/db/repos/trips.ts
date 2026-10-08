import { homePoints, tripSummary } from '../../../src/domain/trips.ts';
import type { Trip } from '../../../src/domain/types.ts';
import type { Query, TripsRepo } from '../types.ts';

const COLS = 'id, title, data, updated_at';

export const tripsRepo = (query: Query): TripsRepo => ({
  list: async () =>
    (await query<Trip & { updated_at: string }>('select id, title, data, updated_at from trips order by updated_at desc')).rows.map((r) => ({
      id: r.id, title: r.title, updated_at: r.updated_at, summary: tripSummary(r.data), points: homePoints(r.data),
    })),
  get: async (id) => (await query<Trip>(`select ${COLS} from trips where id = $1`, [id])).rows[0],
  create: async (title, data) =>
    (await query<Trip>(`insert into trips (title, data) values ($1, $2::jsonb) returning ${COLS}`, [title, JSON.stringify(data)])).rows[0],
  update: async (id, title, data) =>
    (await query<Trip>(`update trips set title = $2, data = $3::jsonb, updated_at = now() where id = $1 returning ${COLS}`, [id, title, JSON.stringify(data)])).rows[0],
  remove: async (id) => { await query('delete from trips where id = $1', [id]); },
});
