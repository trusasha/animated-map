import type { Query } from './types.ts';

// idempotent: runs on every start, on PGlite and Postgres alike
export async function migrate(query: Query) {
  await query(`create table if not exists trips (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await query(`create table if not exists models (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    url text,
    status text not null default 'ready',
    task_id text,
    created_at timestamptz not null default now()
  )`);
  await query('alter table models add column if not exists mode text');
  await query('alter table models add column if not exists pose jsonb');
  await query(`create table if not exists settings (
    id text primary key default 'default',
    data jsonb not null,
    updated_at timestamptz not null default now()
  )`);
  // null user_id = the local single user (auth off) and legacy rows waiting to be claimed
  for (const table of ['trips', 'models', 'settings']) {
    await query(`alter table ${table} add column if not exists user_id text`);
    await query(`create index if not exists ${table}_user_id on ${table} (user_id)`);
  }
  await query('create table if not exists app_meta (key text primary key, value text not null)');
  // telemetry: client and server events, read back by /api/health/stats; only the server (table owner) touches it
  await query(`create table if not exists events (
    id bigserial primary key,
    t timestamptz not null default now(),
    type text not null,
    user_id text,
    session text,
    data jsonb not null default '{}'
  )`);
  await query('create index if not exists events_type_t on events (type, t)');
  await query('alter table events enable row level security');
}
