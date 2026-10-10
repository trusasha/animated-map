import { normalizeSettings } from '../../../src/domain/settings.ts';
import type { Query, SettingsRepo } from '../types.ts';

// one row per user, keyed by the user id; the local user keeps the original 'default' row
const settingsKey = "coalesce($1::text, 'default')";

export const settingsRepo = (query: Query): SettingsRepo => ({
  get: async (owner) => normalizeSettings((await query<{ data: unknown }>(`select data from settings where id = ${settingsKey}`, [owner])).rows[0]?.data ?? {}),
  save: async (owner, raw) => {
    const settings = normalizeSettings(raw);
    await query(
      `insert into settings (id, user_id, data) values (${settingsKey}, $1, $2::jsonb)
       on conflict (id) do update set data = excluded.data, updated_at = now()`,
      [owner, JSON.stringify(settings)],
    );
    return settings;
  },
});
