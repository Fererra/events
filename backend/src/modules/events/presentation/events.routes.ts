import type { FastifyInstance } from 'fastify';
import type { EventsContainer } from '../events.container.js';
import {
  createEventBody,
  eventIdParams,
  eventResponse,
  listEventsQuerystring,
  paginatedEventsResponse,
  type CreateEventBody,
  type EventIdParams,
  type ListEventsQuerystring,
} from './schemas.js';

export function registerEventsRoutes(app: FastifyInstance, events: EventsContainer): void {
  app.get<{ Querystring: ListEventsQuerystring }>(
    '/events',
    {
      schema: { querystring: listEventsQuerystring, response: { 200: paginatedEventsResponse } },
    },
    async (request) => events.listEvents.execute(request.query),
  );

  app.get<{ Params: EventIdParams }>(
    '/events/:id',
    { schema: { params: eventIdParams, response: { 200: eventResponse } } },
    async (request) => events.getEvent.execute(request.params.id),
  );

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
