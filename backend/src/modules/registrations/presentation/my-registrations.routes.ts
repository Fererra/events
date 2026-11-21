import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import { currentUser } from '../../auth/index.js';
import type { ListMyRegistrationsQuery } from '../application/queries/list-my-registrations.js';

const myRegistrationsResponse = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      event: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          startsAt: { type: 'string' },
          endsAt: { type: 'string' },
        },
      },
      ticket: {
        type: 'object',
        properties: { type: { type: 'string' }, price: { type: 'number' } },
      },
      status: { type: 'string', enum: ['ACTIVE', 'CANCELLED'] },
      registeredAt: { type: 'string' },
    },
  },
} as const;

export function registerMyRegistrationsRoutes(
  app: FastifyInstance,
  deps: { requireAuth: preHandlerAsyncHookHandler; query: ListMyRegistrationsQuery },
): void {
  app.get(
    '/me/registrations',
    { preHandler: deps.requireAuth, schema: { response: { 200: myRegistrationsResponse } } },
    async (request) => deps.query.execute(currentUser(request).userId),
  );
}
