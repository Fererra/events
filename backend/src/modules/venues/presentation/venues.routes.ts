import type { FastifyInstance } from 'fastify';
import type { VenuesContainer } from '../venues.container.js';
import { createVenueBody, venueResponse, type CreateVenueBody } from './schemas.js';

export function registerVenuesRoutes(app: FastifyInstance, venues: VenuesContainer): void {
  app.post<{ Body: CreateVenueBody }>(
    '/venues',
    {
      preHandler: venues.guards.requireAdmin,
      schema: { body: createVenueBody, response: { 201: venueResponse } },
    },
    async (request, reply) => {
      const venue = await venues.createVenue.execute(request.body);
      return reply.code(201).send(venue);
    },
  );
}
