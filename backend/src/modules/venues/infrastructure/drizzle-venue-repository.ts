import { asc, count, desc, eq } from 'drizzle-orm';
import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { isUniqueViolation } from '../../../shared/infrastructure/db/pg-errors.js';
import { VenueAddressAlreadyTakenError } from '../domain/errors.js';
import { Venue } from '../domain/venue.js';
import type { IVenueRepository, VenuePage } from '../domain/venue-repository.js';
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

  async findById(id: string): Promise<Venue | null> {
    const [row] = await this.db.executor().select().from(venues).where(eq(venues.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findByNormalizedAddress(normalizedAddress: string): Promise<Venue | null> {
    const [row] = await this.db
      .executor()
      .select()
      .from(venues)
      .where(eq(venues.normalizedAddress, normalizedAddress))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async list({ limit, offset }: { limit: number; offset: number }): Promise<VenuePage> {
    const db = this.db.executor();
    const [rows, totals] = await Promise.all([
      db
        .select()
        .from(venues)
        .orderBy(desc(venues.createdAt), asc(venues.id))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(venues),
    ]);
    return {
      items: rows.map(toDomain),
      total: Number(totals[0]?.total ?? 0),
    };
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

  async save(venue: Venue): Promise<void> {
    try {
      await this.db
        .executor()
        .update(venues)
        .set({
          name: venue.name,
          address: venue.address,
          normalizedAddress: venue.normalizedAddress,
          capacity: venue.capacity,
        })
        .where(eq(venues.id, venue.id));
    } catch (err) {
      if (isUniqueViolation(err)) throw new VenueAddressAlreadyTakenError();
      throw err;
    }
  }
}
