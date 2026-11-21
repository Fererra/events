import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

/**
 * Driver-agnostic Drizzle database handle (node-postgres in runtime,
 * PGlite in tests). A transaction object is assignable to it too, so
 * repositories work the same inside and outside a transaction.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = PgDatabase<PgQueryResultHKT, any>;

/** Gives infrastructure code the executor for the current scope (transaction or pool). */
export interface DbExecutorProvider {
  executor(): Database;
}
