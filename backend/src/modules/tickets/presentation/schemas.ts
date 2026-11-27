import { TICKET_TYPE_MAX_LENGTH } from '../domain/ticket-type.js';

/** JSON Schemas for ticket type validation and serialization. */

export const eventIdParams = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
} as const;

export const createTicketTypeBody = {
  type: 'object',
  required: ['type', 'limit', 'price'],
  additionalProperties: false,
  properties: {
    type: { type: 'string', minLength: 1, maxLength: TICKET_TYPE_MAX_LENGTH },
    // Domain enforces integer > 0 and non-negative price so errors carry domain codes.
    limit: { type: 'number' },
    price: { type: 'number' },
  },
} as const;

export const ticketTypeResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    eventId: { type: 'string' },
    type: { type: 'string' },
    limit: { type: 'integer' },
    price: { type: 'number' },
    createdAt: { type: 'string' },
  },
} as const;

export interface EventIdParams {
  id: string;
}

export interface CreateTicketTypeBody {
  type: string;
  limit: number;
  price: number;
}
