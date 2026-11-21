/** PostgreSQL SQLSTATE 23505 — unique_violation (works for pg and PGlite, also when wrapped by Drizzle). */
export function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current && depth < 5; depth++) {
    if ((current as { code?: unknown }).code === '23505') return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
