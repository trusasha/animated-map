import { connectPglite } from './pglite.ts';
import { connectPostgres } from './postgres.ts';
import { migrate } from './migrations.ts';
import { claimRepo } from './repos/claim.ts';
import { eventsRepo } from './repos/events.ts';
import { modelsRepo } from './repos/models.ts';
import { settingsRepo } from './repos/settings.ts';
import { tripsRepo } from './repos/trips.ts';
import type { DbService, Query } from './types.ts';

export type { DbService, EventsRepo, Owner } from './types.ts';

/** DATABASE_URL picks Postgres/Supabase, otherwise embedded PGlite in dataDir */
export async function createDb(dataDir: string, databaseUrl = process.env.DATABASE_URL): Promise<DbService> {
  return dbOn(databaseUrl ? connectPostgres(databaseUrl) : connectPglite(dataDir));
}

export async function dbOn(query: Query): Promise<DbService> {
  await migrate(query);
  return { query, trips: tripsRepo(query), models: modelsRepo(query), settings: settingsRepo(query), claim: claimRepo(query), events: eventsRepo(query) };
}
