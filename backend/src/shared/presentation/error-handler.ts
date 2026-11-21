import type { FastifyError, FastifyInstance } from 'fastify';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../domain/errors.js';

/** Unified error body for the frontend (see docs/api-errors.md). */
export interface ErrorBody {
  code: string;
  message: string;
  details?: { field: string; message: string }[];
}

/** Domain knows nothing about HTTP — the mapping lives here. */
export function statusFor(error: DomainError): number {
  if (error instanceof ValidationError) return 400;
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  return 400;
}

function fieldOf(instancePath: string, missingProperty?: unknown): string {
  const path = instancePath.replace(/^\//, '').replaceAll('/', '.');
  if (typeof missingProperty === 'string')
    return path ? `${path}.${missingProperty}` : missingProperty;
  return path || '(root)';
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler<FastifyError | DomainError | Error>((error, request, reply) => {
    if (error instanceof DomainError) {
      const body: ErrorBody = { code: error.code, message: error.message };
      return reply.code(statusFor(error)).send(body);
    }

    const fastifyError = error as FastifyError;

    if (fastifyError.validation) {
      const body: ErrorBody = {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: fastifyError.validation.map((v) => ({
          field: fieldOf(v.instancePath, v.params?.missingProperty),
          message: v.message ?? 'is invalid',
        })),
      };
      return reply.code(400).send(body);
    }

    const status = fastifyError.statusCode ?? 500;
    if (status >= 500) {
      request.log.error({ err: error }, 'unhandled error');
      const body: ErrorBody = { code: 'INTERNAL_ERROR', message: 'Internal server error' };
      return reply.code(500).send(body);
    }

    // Framework errors with a client status (malformed JSON, payload too large, ...).
    const body: ErrorBody = { code: fastifyError.code ?? 'BAD_REQUEST', message: error.message };
    return reply.code(status).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ErrorBody = {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    };
    return reply.code(404).send(body);
  });
}
