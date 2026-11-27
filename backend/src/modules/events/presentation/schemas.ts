import { MAX_LIMIT } from '../../../shared/application/pagination.js';
import {
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_ORGANIZER_MAX_LENGTH,
  EVENT_STATUSES,
  EVENT_TITLE_MAX_LENGTH,
  type EventStatus,
} from '../domain/event.js';

/** JSON Schemas for event request validation and response serialization. */

export const createEventBody = {
  type: 'object',
  required: ['title', 'description', 'startsAt', 'endsAt', 'organizer', 'venueId'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: EVENT_TITLE_MAX_LENGTH },
    description: { type: 'string', maxLength: EVENT_DESCRIPTION_MAX_LENGTH },
    startsAt: { type: 'string', format: 'date-time' },
    endsAt: { type: 'string', format: 'date-time' },
    organizer: { type: 'string', minLength: 1, maxLength: EVENT_ORGANIZER_MAX_LENGTH },
    venueId: { type: 'string', format: 'uuid' },
  },
} as const;

export const listEventsQuerystring = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT },
    venueId: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: EVENT_STATUSES },
  },
} as const;

export const eventIdParams = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
} as const;

export const eventResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    startsAt: { type: 'string' },
    endsAt: { type: 'string' },
    organizer: { type: 'string' },
    venueId: { type: 'string' },
    status: { type: 'string', enum: EVENT_STATUSES },
    createdAt: { type: 'string' },
  },
} as const;

export const paginatedEventsResponse = {
  type: 'object',
  properties: {
    items: { type: 'array', items: eventResponse },
    page: { type: 'integer' },
    limit: { type: 'integer' },
    total: { type: 'integer' },
    totalPages: { type: 'integer' },
  },
} as const;

export interface CreateEventBody {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  organizer: string;
  venueId: string;
}

export interface ListEventsQuerystring {
  page?: number;
  limit?: number;
  venueId?: string;
  status?: EventStatus;
}

export interface EventIdParams {
  id: string;
}
