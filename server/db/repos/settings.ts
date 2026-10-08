import { normalizeSettings } from '../../../src/domain/settings.ts';
import type { Query, SettingsRepo } from '../types.ts';

export const settingsRepo = (query: Query): SettingsRepo => ({
  get: async () => normalizeSettings((await query<{ data: unknown }>("select data from settings where id = 'default'")).rows[0]?.data ?? {}),
  save: async (raw) => {
    const settings = normalizeSettings(raw);
    await query(
      `insert into settings (id, data) values ('default', $1::jsonb)
       on conflict (id) do update set data = excluded.data, updated_at = now()`,
      [JSON.stringify(settings)],
    );
    return settings;
  },
});
