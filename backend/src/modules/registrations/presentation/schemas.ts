import { REGISTRATION_STATUSES } from '../domain/registration.js';

/** JSON Schemas for registration request validation and response serialization. */

export const eventRegistrationParams = {
  type: 'object',
  required: ['eventId'],
  additionalProperties: false,
  properties: {
    eventId: { type: 'string', format: 'uuid' },
  },
} as const;

export const registrationIdParams = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
} as const;

export const createRegistrationBody = {
  type: 'object',
  required: ['ticketTypeId'],
  additionalProperties: false,
  properties: {
    ticketTypeId: { type: 'string', format: 'uuid' },
  },
} as const;

export const registrationResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    eventId: { type: 'string' },
    ticketTypeId: { type: 'string' },
    status: { type: 'string', enum: REGISTRATION_STATUSES },
    registeredAt: { type: 'string' },
  },
} as const;

export interface EventRegistrationParams {
  eventId: string;
}

export interface CreateRegistrationBody {
  ticketTypeId: string;
}

export interface RegistrationIdParams {
  id: string;
}
