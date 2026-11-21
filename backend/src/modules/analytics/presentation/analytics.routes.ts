import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import { EVENT_STATUSES, type EventStatus } from '../application/ports/event-catalog.js';
import type { ListEventAnalyticsQuery } from '../application/queries/list-event-analytics.js';

interface AnalyticsQuerystring {
  from?: string;
  to?: string;
  status?: EventStatus;
}

const querystring = {
  type: 'object',
  additionalProperties: false,
  properties: {
    from: { type: 'string', format: 'date-time' },
    to: { type: 'string', format: 'date-time' },
    status: { type: 'string', enum: EVENT_STATUSES },
  },
} as const;

const response = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      event: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          startsAt: { type: 'string' },
          endsAt: { type: 'string' },
          status: { type: 'string' },
        },
      },
      registrationsCount: { type: 'integer' },
      isCancelled: { type: 'boolean' },
      lastActivityAt: { type: ['string', 'null'] },
    },
  },
} as const;

export function registerAnalyticsRoutes(
  app: FastifyInstance,
  deps: { requireAdmin: preHandlerAsyncHookHandler; query: ListEventAnalyticsQuery },
): void {
  app.get<{ Querystring: AnalyticsQuerystring }>(
    '/analytics/events',
    { preHandler: deps.requireAdmin, schema: { querystring, response: { 200: response } } },
    async (request) => {
      const { from, to, status } = request.query;
      return deps.query.execute({
        ...(from && { from: new Date(from) }),
        ...(to && { to: new Date(to) }),
        ...(status && { status }),
      });
    },
  );
}
