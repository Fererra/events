import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../src/shared/domain/errors.js';
import { registerErrorHandler } from '../../src/shared/presentation/error-handler.js';

describe('error handler', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    registerErrorHandler(app);
    const errors: Record<string, Error> = {
      conflict: new ConflictError('EMAIL_TAKEN', 'Email is already taken'),
      notfound: new NotFoundError('Event', '42'),
      unauthorized: new UnauthorizedError(),
      forbidden: new ForbiddenError(),
      invalid: new ValidationError('CAPACITY_INVALID', 'Capacity must be positive'),
      crash: new Error('db exploded'),
    };
    app.get<{ Params: { kind: string } }>('/throw/:kind', async (req) => {
      throw errors[req.params.kind];
    });
    app.post(
      '/validate',
      {
        schema: {
          body: {
            type: 'object',
            required: ['email'],
            properties: { email: { type: 'string', format: 'email' } },
          },
        },
      },
      async () => ({ ok: true }),
    );
    await app.ready();
  });
  afterAll(() => app.close());

  it.each([
    ['conflict', 409, 'EMAIL_TAKEN'],
    ['notfound', 404, 'EVENT_NOT_FOUND'],
    ['unauthorized', 401, 'UNAUTHORIZED'],
    ['forbidden', 403, 'FORBIDDEN'],
    ['invalid', 400, 'CAPACITY_INVALID'],
  ])('maps %s domain error to HTTP %i', async (kind, status, code) => {
    const res = await app.inject({ method: 'GET', url: `/throw/${kind}` });
    expect(res.statusCode).toBe(status);
    expect(res.json()).toMatchObject({ code });
  });

  it('hides internals of unexpected errors behind 500', async () => {
    const res = await app.inject({ method: 'GET', url: '/throw/crash' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  });

  it('returns 400 with field list for schema validation errors', async () => {
    const res = await app.inject({ method: 'POST', url: '/validate', payload: {} });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'email' }],
    });
  });

  it('returns unified body for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'ROUTE_NOT_FOUND' });
  });
});
