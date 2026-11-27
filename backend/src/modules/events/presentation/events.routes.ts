import type { FastifyInstance } from 'fastify';
import type { EventsContainer } from '../events.container.js';
import { createEventBody, eventResponse, type CreateEventBody } from './schemas.js';

export function registerEventsRoutes(app: FastifyInstance, events: EventsContainer): void {
  app.post<{ Body: CreateEventBody }>(
    '/events',
    {
      preHandler: events.guards.requireAdmin,
      schema: { body: createEventBody, response: { 201: eventResponse } },
    },
    async (request, reply) => {
      const event = await events.createEvent.execute({
        ...request.body,
        startsAt: new Date(request.body.startsAt),
        endsAt: new Date(request.body.endsAt),
      });
      return reply.code(201).send(event);
    },
  );
}
