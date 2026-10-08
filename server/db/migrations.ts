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
}
