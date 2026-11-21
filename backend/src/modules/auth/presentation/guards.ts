import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../../../shared/domain/errors.js';
import type { ITokenService } from '../application/ports/token-service.js';
import type { Role } from '../domain/role.js';

/** Identity of the caller, extracted from the access JWT. */
export interface AuthUser {
  userId: string;
  role: Role;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `requireAuth`; undefined on public routes. */
    authUser?: AuthUser;
  }
}

export interface AuthGuards {
  /** JwtGuard: 401 before any business logic if the access token is missing / invalid. */
  requireAuth: preHandlerAsyncHookHandler;
  /** AdminGuard: JwtGuard + 403 unless role is `admin`. */
  requireAdmin: preHandlerAsyncHookHandler;
}

function bearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization;
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  if (!match?.[1]) {
    throw new UnauthorizedError('UNAUTHORIZED', 'Missing bearer access token');
  }
  return match[1];
}

export function createAuthGuards(tokens: ITokenService): AuthGuards {
  const requireAuth = async (request: FastifyRequest, _reply: FastifyReply) => {
    const claims = tokens.verifyAccessToken(bearerToken(request));
    request.authUser = { userId: claims.sub, role: claims.role };
  };

  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (request.authUser?.role !== 'admin') {
      throw new ForbiddenError('FORBIDDEN', 'Administrator role required');
    }
  };

  return { requireAuth, requireAdmin };
}

/** Use in handlers behind `requireAuth`: returns the caller or throws 401. */
export function currentUser(request: FastifyRequest): AuthUser {
  if (!request.authUser) throw new UnauthorizedError();
  return request.authUser;
}
