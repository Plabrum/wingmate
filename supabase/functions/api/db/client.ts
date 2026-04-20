import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.ts';

const sql = postgres(Deno.env.get('DATABASE_URL') ?? '', {
  max: 1,
  prepare: false,
});

export const db = drizzle(sql, { schema });
export { schema };
