import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp, modules } from '../../src/app.js';
import { loadConfig } from '../../src/shared/config/env.js';

describe('app skeleton', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(loadConfig({ NODE_ENV: 'test' }));
  });
  afterAll(() => app.close());

  it('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
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
