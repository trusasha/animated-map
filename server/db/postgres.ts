import pg from 'pg';
import type { Query } from './types.ts';

export function connectPostgres(url: string): Query {
  const pool = new pg.Pool({ connectionString: url, ssl: url.includes('localhost') ? false : { rejectUnauthorized: false } });
  return async <T,>(sql: string, params?: unknown[]) => ({ rows: (await pool.query(sql, params as never[])).rows as T[] });
}
