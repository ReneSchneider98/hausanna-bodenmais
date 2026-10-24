import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;

export function createDatabase(pool: Pool): Database {
  return drizzle(pool, { schema });
}

/** Postgres-Fehlercodes, die wir fachlich behandeln */
export const PG_ERROR = {
  exclusionViolation: '23P01',
  uniqueViolation: '23505',
  foreignKeyViolation: '23503',
} as const;

export function pgErrorCode(err: unknown): string | undefined {
  let e: unknown = err;
  for (let i = 0; i < 3 && e && typeof e === 'object'; i++) {
    if ('code' in e && typeof (e as { code: unknown }).code === 'string') {
      return (e as { code: string }).code;
    }
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}
