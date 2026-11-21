import type { FastifyInstance } from 'fastify';
import type { AuthContainer } from '../auth.container.js';
import { currentUser } from './guards.js';
import {
  credentialsBody,
  loginBody,
  refreshTokenBody,
  tokenPairResponse,
  userResponse,
  type CredentialsBody,
  type RefreshTokenBody,
} from './schemas.js';

export function registerAuthRoutes(app: FastifyInstance, auth: AuthContainer): void {
  app.post<{ Body: CredentialsBody }>(
    '/auth/register',
    { schema: { body: credentialsBody, response: { 201: userResponse } } },
    async (request, reply) => {
      const user = await auth.registerUser.execute(request.body);
      return reply.code(201).send(user);
    },
  );

  app.post<{ Body: CredentialsBody }>(
    '/auth/login',
    { schema: { body: loginBody, response: { 200: tokenPairResponse } } },
    async (request) => auth.loginUser.execute(request.body),
  );

  app.post<{ Body: RefreshTokenBody }>(
    '/auth/refresh',
    { schema: { body: refreshTokenBody, response: { 200: tokenPairResponse } } },
    async (request) => auth.refreshTokens.execute(request.body.refreshToken),
  );

  app.post<{ Body: RefreshTokenBody }>(
    '/auth/logout',
    { schema: { body: refreshTokenBody } },
    async (request, reply) => {
      await auth.logout.execute(request.body.refreshToken);
      return reply.code(204).send();
    },
  );

  app.get(
    '/me',
    { preHandler: auth.guards.requireAuth, schema: { response: { 200: userResponse } } },
    async (request) => auth.getProfile.execute(currentUser(request).userId),
  );
}
