import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import * as schema from './schema.ts';
import { config } from '../lib/config.ts';

// The module-level `db` is the per-isolate connection pool. Only
// `middleware/transaction.ts` should import it — handlers and query helpers get
// the request-scoped transaction from `c.var.db` instead.
const sql = postgres(config.databaseUrl, {
  max: 10,
  prepare: false,
});

export const db = drizzle(sql, { schema });
export { schema };

export type Schema = typeof schema;
export type DB = typeof db;
export type Tx = PgTransaction<PostgresJsQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;
export type DBOrTx = DB | Tx;
