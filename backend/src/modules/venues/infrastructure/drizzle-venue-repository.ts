import { eq } from 'drizzle-orm';
import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { isUniqueViolation } from '../../../shared/infrastructure/db/pg-errors.js';
import { VenueAddressAlreadyTakenError } from '../domain/errors.js';
import { Venue } from '../domain/venue.js';
import type { IVenueRepository } from '../domain/venue-repository.js';
import { venues, type VenueRow } from './venues.schema.js';

function toDomain(row: VenueRow): Venue {
  return Venue.restore({
    id: row.id,
    name: row.name,
    address: row.address,
    normalizedAddress: row.normalizedAddress,
    capacity: row.capacity,
    createdAt: row.createdAt,
  });
}

export class DrizzleVenueRepository implements IVenueRepository {
  constructor(private readonly db: DbExecutorProvider) {}

  async findByNormalizedAddress(normalizedAddress: string): Promise<Venue | null> {
    const [row] = await this.db
      .executor()
      .select()
      .from(venues)
      .where(eq(venues.normalizedAddress, normalizedAddress))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async add(venue: Venue): Promise<void> {
    try {
      await this.db.executor().insert(venues).values({
        id: venue.id,
        name: venue.name,
        address: venue.address,
        normalizedAddress: venue.normalizedAddress,
        capacity: venue.capacity,
        createdAt: venue.createdAt,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new VenueAddressAlreadyTakenError();
      throw err;
    }
  }
}
