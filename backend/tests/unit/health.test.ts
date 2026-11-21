import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { modules } from '../../src/app.js';
import { createTestApp } from '../helpers/test-app.js';

describe('app skeleton', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(() => app.close());

  it('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /health/db checks the database', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/db' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('registers all six modules of the modular monolith', () => {
    expect(modules.map((m) => m.name)).toEqual([
      'auth',
      'venues',
      'events',
      'tickets',
      'registrations',
      'analytics',
    ]);
  });
});
