import type { FastifyInstance } from 'fastify';
import type { TicketsContainer } from '../tickets.container.js';
import {
  createTicketTypeBody,
  eventIdParams,
  ticketTypeResponse,
  type CreateTicketTypeBody,
  type EventIdParams,
} from './schemas.js';

export function registerTicketsRoutes(app: FastifyInstance, tickets: TicketsContainer): void {
  app.post<{ Params: EventIdParams; Body: CreateTicketTypeBody }>(
    '/events/:id/tickets',
    {
      preHandler: tickets.guards.requireAdmin,
      schema: {
        params: eventIdParams,
        body: createTicketTypeBody,
        response: { 201: ticketTypeResponse },
      },
    },
    async (request, reply) => {
      const ticket = await tickets.createTicketType.execute({
        eventId: request.params.id,
        ...request.body,
      });
      return reply.code(201).send(ticket);
    },
  );
}
