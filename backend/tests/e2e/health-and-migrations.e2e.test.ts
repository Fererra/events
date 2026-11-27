import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { bearer, login } from '../helpers/auth.js';
import { createPgTestApp, type PgTestApp } from '../helpers/pg-test-app.js';
import { rowsOf } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

describe('PostgreSQL health, migrations and bootstrap', () => {
  let t: PgTestApp;

  beforeAll(async () => {
    t = await createPgTestApp(ADMIN);
    await t.app.ready();
  });

  afterAll(() => t.close());

  it('responds 200 on /health and /health/db backed by real PostgreSQL', async () => {
    const liveness = await t.app.inject({ method: 'GET', url: '/health' });
    expect(liveness.statusCode).toBe(200);
    expect(liveness.json()).toEqual({ status: 'ok' });

    const readiness = await t.app.inject({ method: 'GET', url: '/health/db' });
    expect(readiness.statusCode).toBe(200);
    expect(readiness.json()).toEqual({ status: 'ok' });
  });

  it('applies all module migrations creating the expected schema tables', async () => {
    const result = await t.db.execute(
      sql`select tablename from pg_tables where schemaname = 'public' order by tablename`,
    );
    const tables = rowsOf<{ tablename: string }>(result).map((r) => r.tablename);

    expect(tables).toEqual(
      expect.arrayContaining([
        'users',
        'refresh_tokens',
        'venues',
        'events',
        'ticket_types',
        'registrations',
        'event_stats',
      ]),
    );
  });

  it('bootstraps the administrator account and serves GET /me', async () => {
    const { accessToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD);

    const profile = await t.app.inject({
      method: 'GET',
      url: '/me',
      headers: bearer(accessToken),
    });
    expect(profile.statusCode).toBe(200);
    expect(profile.json()).toMatchObject({
      email: ADMIN.ADMIN_EMAIL,
      role: 'admin',
      surname: null,
      name: null,
      phone: null,
    });
  });
});
