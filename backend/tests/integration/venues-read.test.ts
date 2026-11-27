import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

describe('GET /venues and GET /venues/:id', () => {
  let t: TestApp;
  let adminToken: string;
  let userToken: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    t = await createTestApp(ADMIN);
    await t.app.ready();
    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
    ({ accessToken: userToken } = await registerAndLogin(t.app, 'viewer@example.com'));

    for (let i = 1; i <= 5; i++) {
      const res = await t.app.inject({
        method: 'POST',
        url: '/venues',
        headers: bearer(adminToken),
        payload: { name: `Hall ${i}`, address: `Kyiv, Venue Ave ${i}`, capacity: i * 50 },
      });
      expect(res.statusCode).toBe(201);
      createdIds.push(res.json<{ id: string }>().id);
    }
  });
  afterAll(() => t.close());

  it('lists venues with pagination for guests (no auth required)', async () => {
    const page1 = await t.app.inject({ method: 'GET', url: '/venues?page=1&limit=2' });
    expect(page1.statusCode).toBe(200);
    const b1 = page1.json();
    expect(b1).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
    expect(b1.items).toHaveLength(2);

    const page3 = await t.app.inject({ method: 'GET', url: '/venues?page=3&limit=2' });
    expect(page3.statusCode).toBe(200);
    expect(page3.json().items).toHaveLength(1);

    const idsAcrossPages = [
      ...b1.items.map((v: { id: string }) => v.id),
      ...(await t.app.inject({ method: 'GET', url: '/venues?page=2&limit=2' }))
        .json()
        .items.map((v: { id: string }) => v.id),
      ...page3.json().items.map((v: { id: string }) => v.id),
    ];
    expect(new Set(idsAcrossPages)).toEqual(new Set(createdIds));
  });

  it('lists venues with default pagination for authenticated users too', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: '/venues',
      headers: bearer(userToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ page: 1, limit: 20, total: 5, totalPages: 1 });
    expect(res.json().items).toHaveLength(5);
  });

  it('returns venue details by id without authentication', async () => {
    const targetId = createdIds[0]!;
    const res = await t.app.inject({ method: 'GET', url: `/venues/${targetId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: targetId,
      name: 'Hall 1',
      address: 'Kyiv, Venue Ave 1',
      capacity: 50,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  it('unknown venue UUID → 404 VENUE_NOT_FOUND', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: '/venues/00000000-0000-4000-8000-000000000000',
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('VENUE_NOT_FOUND');
  });

  it('invalid UUID or invalid pagination params → 400 VALIDATION_ERROR', async () => {
    const badId = await t.app.inject({ method: 'GET', url: '/venues/not-a-uuid' });
    expect(badId.statusCode).toBe(400);
    expect(badId.json().code).toBe('VALIDATION_ERROR');

    const badPage = await t.app.inject({ method: 'GET', url: '/venues?page=0&limit=500' });
    expect(badPage.statusCode).toBe(400);
    expect(badPage.json().code).toBe('VALIDATION_ERROR');
  });
});
