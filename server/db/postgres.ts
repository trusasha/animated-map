import pg from 'pg';
import type { Query } from './types.ts';

export function connectPostgres(url: string): Query {
  const pool = new pg.Pool({ connectionString: url, ssl: url.includes('localhost') ? false : { rejectUnauthorized: false } });
  return (sql, params) => pool.query(sql, params as any[]);
}
