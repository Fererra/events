import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestApp, rowsOf, type TestApp } from '../helpers/test-app.js';

describe('POST /auth/register', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const base = {
    surname: 'Kovalenko',
    name: 'Olena',
    phone: '+38 (050) 123-45-67',
    password: 'secret-pass',
  };

  const register = (payload: object) =>
    t.app.inject({ method: 'POST', url: '/auth/register', payload });

  it('creates an account with profile fields and role user → 201', async () => {
    const res = await register({ ...base, email: 'new@example.com' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      email: 'new@example.com',
      surname: 'Kovalenko',
      name: 'Olena',
      phone: '+380501234567',
      role: 'user',
    });
    expect(res.json()).not.toHaveProperty('passwordHash');
  });

  it('allows two different accounts to share the same phone number', async () => {
    const a = await register({ ...base, email: 'phone1@example.com', phone: '+380671112233' });
    const b = await register({ ...base, email: 'phone2@example.com', phone: '+380671112233' });
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(201);
  });

  it('stores the password only as an Argon2id hash with OWASP parameters', async () => {
    await register({ ...base, email: 'hash@example.com' });
    const rows = rowsOf<{
      password_hash: string;
      surname: string | null;
      name: string | null;
      phone: string | null;
    }>(
      await t.db.execute(
        sql`select password_hash, surname, name, phone from users where email = 'hash@example.com'`,
      ),
    );
    expect(rows[0]?.password_hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(rows[0]).toMatchObject({
      surname: 'Kovalenko',
      name: 'Olena',
      phone: '+380501234567',
    });
  });

  it('duplicate e-mail → 409 EMAIL_TAKEN', async () => {
    await register({ ...base, email: 'dup@example.com' });
    const res = await register({ ...base, email: 'DUP@example.com' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ code: 'EMAIL_TAKEN', message: 'Email is already taken' });
  });

  it('concurrent registrations with the same e-mail: exactly one wins, others → 409', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => register({ ...base, email: 'race@example.com' })),
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

  it('invalid phone format → 400 PHONE_INVALID', async () => {
    const res = await register({
      ...base,
      email: 'badphone@example.com',
      phone: 'not-a-phone-123',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('PHONE_INVALID');
  });
});
