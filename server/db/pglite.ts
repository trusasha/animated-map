import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { Query } from './types.ts';

export function connectPglite(dir: string): Query {
  mkdirSync(dir, { recursive: true });
  const pg = new PGlite(`${dir}/pg`);
  return (sql, params) => pg.query(sql, params);
}
