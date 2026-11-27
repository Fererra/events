import type { FastifyInstance } from 'fastify';
import type { VenuesContainer } from '../venues.container.js';
import {
  createVenueBody,
  listVenuesQuerystring,
  paginatedVenuesResponse,
  updateVenueBody,
  venueIdParams,
  venueResponse,
  type CreateVenueBody,
  type ListVenuesQuerystring,
  type UpdateVenueBody,
  type VenueIdParams,
} from './schemas.js';

export function registerVenuesRoutes(app: FastifyInstance, venues: VenuesContainer): void {
  app.get<{ Querystring: ListVenuesQuerystring }>(
    '/venues',
    {
      schema: { querystring: listVenuesQuerystring, response: { 200: paginatedVenuesResponse } },
    },
    async (request) => venues.listVenues.execute(request.query),
  );

  app.get<{ Params: VenueIdParams }>(
    '/venues/:id',
    { schema: { params: venueIdParams, response: { 200: venueResponse } } },
    async (request) => venues.getVenue.execute(request.params.id),
  );

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

  app.patch<{ Params: VenueIdParams; Body: UpdateVenueBody }>(
    '/venues/:id',
    {
      preHandler: venues.guards.requireAdmin,
      schema: { params: venueIdParams, body: updateVenueBody, response: { 200: venueResponse } },
    },
    async (request) => venues.updateVenue.execute({ id: request.params.id, ...request.body }),
  );
}
