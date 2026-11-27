import { describe, expect, it } from 'vitest';
import { GetVenueQuery } from '../../../src/modules/venues/application/queries/get-venue.js';
import { ListVenuesQuery } from '../../../src/modules/venues/application/queries/list-venues.js';
import { Venue } from '../../../src/modules/venues/domain/venue.js';
import { NotFoundError } from '../../../src/shared/domain/errors.js';
import { InMemoryVenueRepository } from './fakes.js';

async function seed(repo: InMemoryVenueRepository, count: number) {
  const items: Venue[] = [];
  for (let i = 1; i <= count; i++) {
    const venue = Venue.create({
      id: `v-${i}`,
      name: `Venue ${i}`,
      address: `Kyiv, Street ${i}`,
      capacity: i * 100,
      now: new Date(Date.UTC(2026, 10, i)),
    });
    items.push(venue);
    await repo.add(venue);
  }
  return items;
}

describe('Venues queries (ES-14)', () => {
  it('lists venues with defaults when empty', async () => {
    const repo = new InMemoryVenueRepository();
    const res = await new ListVenuesQuery(repo).execute();
    expect(res).toEqual({ items: [], page: 1, limit: 20, total: 0, totalPages: 1 });
  });

  it('paginates venues newest first', async () => {
    const repo = new InMemoryVenueRepository();
    await seed(repo, 5);
    const query = new ListVenuesQuery(repo);

    const p1 = await query.execute({ page: 1, limit: 2 });
    expect(p1.items.map((v) => v.id)).toEqual(['v-5', 'v-4']);
    expect(p1).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });

    const p3 = await query.execute({ page: 3, limit: 2 });
    expect(p3.items.map((v) => v.id)).toEqual(['v-1']);
  });

  it('returns venue details by id and throws NotFoundError for unknown id', async () => {
    const repo = new InMemoryVenueRepository();
    await seed(repo, 1);
    const query = new GetVenueQuery(repo);

    expect(await query.execute('v-1')).toMatchObject({ id: 'v-1', name: 'Venue 1', capacity: 100 });
    await expect(query.execute('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
