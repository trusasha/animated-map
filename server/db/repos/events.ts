import type { EventsRepo, Query } from '../types.ts';

/** events older than this are dropped on start */
const KEEP_DAYS = 90;

export const eventsRepo = (query: Query): EventsRepo => ({
  async add(owner, type, session, data) {
    await query('insert into events (type, user_id, session, data) values ($1, $2, $3, $4::jsonb)', [type, owner, session, JSON.stringify(data)]);
  },
  async counts(hours) {
    const { rows } = await query<{ type: string; n: string }>(
      `select type, count(*)::text as n from events where t > now() - make_interval(hours => $1) group by type`, [hours]);
    return Object.fromEntries(rows.map((r) => [r.type, Number(r.n)]));
  },
  async recent(types, limit) {
    const { rows } = await query<{ t: string; type: string; user_id: string | null; data: Record<string, unknown> }>(
      'select t, type, user_id, data from events where type = any($1) order by t desc limit $2', [types, limit]);
    return rows;
  },
  async prune() {
    await query(`delete from events where t < now() - make_interval(days => ${KEEP_DAYS})`);
  },
});
