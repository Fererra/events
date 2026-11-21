import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestApp, rowsOf, type TestApp } from '../helpers/test-app.js';

describe('POST /auth/register', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const register = (payload: object) =>
    t.app.inject({ method: 'POST', url: '/auth/register', payload });

  it('creates an account with role user → 201', async () => {
    const res = await register({ email: 'new@example.com', password: 'secret-pass' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ email: 'new@example.com', role: 'user' });
    expect(res.json()).not.toHaveProperty('passwordHash');
  });

  it('stores the password only as an Argon2id hash with OWASP parameters', async () => {
    await register({ email: 'hash@example.com', password: 'secret-pass' });
    const rows = rowsOf<{ password_hash: string }>(
      await t.db.execute(sql`select password_hash from users where email = 'hash@example.com'`),
    );
    expect(rows[0]?.password_hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it('duplicate e-mail → 409 EMAIL_TAKEN', async () => {
    await register({ email: 'dup@example.com', password: 'secret-pass' });
    const res = await register({ email: 'DUP@example.com', password: 'secret-pass' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ code: 'EMAIL_TAKEN', message: 'Email is already taken' });
  });

  it('concurrent registrations with the same e-mail: exactly one wins, others → 409', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        register({ email: 'race@example.com', password: 'secret-pass' }),
      ),
    );
    const codes = results.map((r) => r.statusCode).sort();
    expect(codes).toEqual([201, 409, 409, 409, 409]);
    const rows = rowsOf<{ n: number }>(
      await t.db.execute(
        sql`select count(*)::int as n from users where email = 'race@example.com'`,
      ),
    );
    expect(rows[0]?.n).toBe(1);
  });

  it('invalid body → 400 VALIDATION_ERROR with fields', async () => {
    const res = await register({ email: 'nope', password: '123' });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details.length).toBeGreaterThan(0);
  });
});
