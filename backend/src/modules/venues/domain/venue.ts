import { ValidationError } from '../../../shared/domain/errors.js';

export const VENUE_NAME_MAX_LENGTH = 200;
export const VENUE_ADDRESS_MAX_LENGTH = 300;

/** Collapses outer/inner whitespace and lowercases for case-insensitive uniqueness checks. */
export function normalizeVenueAddress(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

function parseName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0 || name.length > VENUE_NAME_MAX_LENGTH) {
    throw new ValidationError(
      'VENUE_NAME_INVALID',
      `Venue name must be 1-${VENUE_NAME_MAX_LENGTH} characters long`,
    );
  }
  return name;
}

function parseAddress(raw: string): string {
  const address = raw.trim().replace(/\s+/g, ' ');
  if (address.length === 0 || address.length > VENUE_ADDRESS_MAX_LENGTH) {
    throw new ValidationError(
      'VENUE_ADDRESS_INVALID',
      `Venue address must be 1-${VENUE_ADDRESS_MAX_LENGTH} characters long`,
    );
  }
  return address;
}

function parseCapacity(capacity: number): number {
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new ValidationError('CAPACITY_INVALID', 'Capacity must be a positive integer');
  }
  return capacity;
}

export interface VenueProps {
  id: string;
  name: string;
  address: string;
  normalizedAddress: string;
  capacity: number;
  createdAt: Date;
}

export interface UpdateVenuePatch {
  name?: string;
  address?: string;
  capacity?: number;
}

/**
 * Venue (location) aggregate root of the Venues module.
 * Enforces positive integer capacity and non-empty name/address invariants.
 */
export class Venue {
  private constructor(private props: VenueProps) {}

  static create(input: {
    id: string;
    name: string;
    address: string;
    capacity: number;
    now: Date;
  }): Venue {
    const name = parseName(input.name);
    const address = parseAddress(input.address);
    const capacity = parseCapacity(input.capacity);

    return new Venue({
      id: input.id,
      name,
      address,
      normalizedAddress: normalizeVenueAddress(address),
      capacity,
      createdAt: input.now,
    });
  }

  /** Rehydrates a persisted venue (used by repositories). */
  static restore(props: VenueProps): Venue {
    return new Venue({ ...props });
  }

  update(patch: UpdateVenuePatch): void {
    const name = patch.name !== undefined ? parseName(patch.name) : this.props.name;
    const address = patch.address !== undefined ? parseAddress(patch.address) : this.props.address;
    const capacity =
      patch.capacity !== undefined ? parseCapacity(patch.capacity) : this.props.capacity;

    this.props = {
      ...this.props,
      name,
      address,
      normalizedAddress: normalizeVenueAddress(address),
      capacity,
    };
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get address(): string {
    return this.props.address;
  }
  get normalizedAddress(): string {
    return this.props.normalizedAddress;
  }
  get capacity(): number {
    return this.props.capacity;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
