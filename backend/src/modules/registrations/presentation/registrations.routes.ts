import type { FastifyInstance } from 'fastify';
import { currentUser } from '../../auth/index.js';
import type { RegistrationsContainer } from '../registrations.container.js';
import {
  createRegistrationBody,
  eventRegistrationParams,
  registrationIdParams,
  registrationResponse,
  type CreateRegistrationBody,
  type EventRegistrationParams,
  type RegistrationIdParams,
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

  app.delete<{ Params: RegistrationIdParams }>(
    '/registrations/:id',
    {
      preHandler: registrations.guards.requireAuth,
      schema: { params: registrationIdParams },
    },
    async (request, reply) => {
      const actor = currentUser(request);
      await registrations.cancelRegistration.execute({
        registrationId: request.params.id,
        actorId: actor.userId,
        actorRole: actor.role,
      });
      return reply.code(204).send();
    },
  );

  app.delete<{ Params: RegistrationIdParams }>(
    '/admin/registrations/:id',
    {
      preHandler: registrations.guards.requireAdmin,
      schema: { params: registrationIdParams },
    },
    async (request, reply) => {
      const actor = currentUser(request);
      await registrations.cancelRegistration.execute({
        registrationId: request.params.id,
        actorId: actor.userId,
        actorRole: actor.role,
      });
      return reply.code(204).send();
    },
  );
}
