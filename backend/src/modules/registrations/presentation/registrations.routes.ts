import type { FastifyInstance } from 'fastify';
import { currentUser } from '../../auth/index.js';
import type { RegistrationsContainer } from '../registrations.container.js';
import {
  createRegistrationBody,
  eventRegistrationParams,
  registrationResponse,
  type CreateRegistrationBody,
  type EventRegistrationParams,
} from './schemas.js';

export function registerRegistrationsRoutes(
  app: FastifyInstance,
  registrations: RegistrationsContainer,
): void {
  app.post<{ Params: EventRegistrationParams; Body: CreateRegistrationBody }>(
    '/events/:eventId/registrations',
    {
      preHandler: registrations.guards.requireAuth,
      schema: {
        params: eventRegistrationParams,
        body: createRegistrationBody,
        response: { 201: registrationResponse },
      },
    },
    async (request, reply) => {
      const created = await registrations.createRegistration.execute({
        userId: currentUser(request).userId,
        eventId: request.params.eventId,
        ticketTypeId: request.body.ticketTypeId,
      });
      return reply.code(201).send(created);
    },
  );
}
