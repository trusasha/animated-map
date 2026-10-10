import type { ClaimRepo, Query } from '../types.ts';

const KEY = 'legacy_claimed_by';

export const claimRepo = (query: Query): ClaimRepo => ({
  claimedBy: async () => (await query<{ value: string }>('select value from app_meta where key = $1', [KEY])).rows[0]?.value ?? null,
  async claimLegacy(owner, label) {
    // the marker goes in first, so two concurrent first requests can't both claim
    const won = await query('insert into app_meta (key, value) values ($1, $2) on conflict (key) do nothing returning key', [KEY, label]);
    if (!won.rows.length) return null;
    const count = async (sql: string) => (await query(sql, [owner])).rows.length;
    return {
      trips: await count('update trips set user_id = $1 where user_id is null returning id'),
      models: await count('update models set user_id = $1 where user_id is null returning id'),
      settings: await count(`update settings set id = $1, user_id = $1 where id = 'default' and not exists (select 1 from settings where id = $1) returning id`),
    };
  },
});
