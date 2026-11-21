import type { FastifyInstance } from 'fastify';
import type { AuthContainer } from '../auth.container.js';
import { credentialsBody, userResponse, type CredentialsBody } from './schemas.js';

export function registerAuthRoutes(app: FastifyInstance, auth: AuthContainer): void {
  app.post<{ Body: CredentialsBody }>(
    '/auth/register',
    { schema: { body: credentialsBody, response: { 201: userResponse } } },
    async (request, reply) => {
      const user = await auth.registerUser.execute(request.body);
      return reply.code(201).send(user);
    },
  );
}
