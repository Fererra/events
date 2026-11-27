import { VENUE_ADDRESS_MAX_LENGTH, VENUE_NAME_MAX_LENGTH } from '../domain/venue.js';

/** JSON Schemas for venue request validation and response serialization. */

export const createVenueBody = {
  type: 'object',
  required: ['name', 'address', 'capacity'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: VENUE_NAME_MAX_LENGTH },
    address: { type: 'string', minLength: 1, maxLength: VENUE_ADDRESS_MAX_LENGTH },
    // Domain validates integer > 0 so invalid values produce CAPACITY_INVALID.
    capacity: { type: 'number' },
  },
} as const;

export const venueResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    address: { type: 'string' },
    capacity: { type: 'integer' },
    createdAt: { type: 'string' },
  },
} as const;

export interface CreateVenueBody {
  name: string;
  address: string;
  capacity: number;
}
