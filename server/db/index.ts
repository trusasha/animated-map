import { connectPglite } from './pglite.ts';
import { connectPostgres } from './postgres.ts';
import { migrate } from './migrations.ts';
import { modelsRepo } from './repos/models.ts';
import { settingsRepo } from './repos/settings.ts';
import { tripsRepo } from './repos/trips.ts';
import type { DbService } from './types.ts';

export type { DbService } from './types.ts';

/** DATABASE_URL picks Postgres/Supabase, otherwise embedded PGlite in dataDir */
export async function createDb(dataDir: string, databaseUrl = process.env.DATABASE_URL): Promise<DbService> {
  const query = databaseUrl ? connectPostgres(databaseUrl) : connectPglite(dataDir);
  await migrate(query);
  return { query, trips: tripsRepo(query), models: modelsRepo(query), settings: settingsRepo(query) };
}
