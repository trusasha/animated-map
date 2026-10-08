import { mkdirSync } from 'node:fs';
import type { CustomModel, Trip, TripData } from '../src/types.ts';

type Query = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;

// Same SQL runs on embedded PGlite (local) and on any Postgres (Supabase) via DATABASE_URL.
async function connect(): Promise<Query> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: url, ssl: url.includes('localhost') ? false : { rejectUnauthorized: false } });
    return (sql, params) => pool.query(sql, params as any[]);
  }
  const { PGlite } = await import('@electric-sql/pglite');
  mkdirSync('data', { recursive: true });
  const db = new PGlite('data/pg');
  return (sql, params) => db.query(sql, params);
}

const query = await connect();

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

export const db = {
  listTrips: async (): Promise<Trip[]> =>
    (await query('select id, title, updated_at from trips order by updated_at desc')).rows,
  getTrip: async (id: string): Promise<Trip | undefined> =>
    (await query('select id, title, data, updated_at from trips where id = $1', [id])).rows[0],
  createTrip: async (title: string, data: TripData): Promise<Trip> =>
    (await query('insert into trips (title, data) values ($1, $2::jsonb) returning id, title, data, updated_at', [title, JSON.stringify(data)])).rows[0],
  updateTrip: async (id: string, title: string, data: TripData): Promise<Trip | undefined> =>
    (await query('update trips set title = $2, data = $3::jsonb, updated_at = now() where id = $1 returning id, title, data, updated_at', [id, title, JSON.stringify(data)])).rows[0],
  deleteTrip: async (id: string) => { await query('delete from trips where id = $1', [id]); },

  listModels: async (): Promise<CustomModel[]> =>
    (await query('select id, name, url, status, task_id, mode, pose from models order by created_at desc')).rows,
  createModel: async (m: Omit<CustomModel, 'id' | 'pose'>): Promise<CustomModel> =>
    (await query('insert into models (name, url, status, task_id, mode) values ($1, $2, $3, $4, $5) returning id, name, url, status, task_id, mode, pose', [m.name, m.url, m.status, m.task_id, m.mode])).rows[0],
  updateModel: async (id: string, url: string | null, status: string): Promise<CustomModel> =>
    (await query('update models set url = $2, status = $3 where id = $1 returning id, name, url, status, task_id, mode, pose', [id, url, status])).rows[0],
  getModel: async (id: string): Promise<CustomModel | undefined> =>
    (await query('select id, name, url, status, task_id, mode, pose from models where id = $1', [id])).rows[0],
  editModel: async (id: string, m: Pick<CustomModel, 'name' | 'mode' | 'pose'>): Promise<CustomModel | undefined> =>
    (await query('update models set name = $2, mode = $3, pose = $4::jsonb where id = $1 returning id, name, url, status, task_id, mode, pose', [id, m.name, m.mode, JSON.stringify(m.pose)])).rows[0],
  deleteModel: async (id: string) => { await query('delete from models where id = $1', [id]); },
};
