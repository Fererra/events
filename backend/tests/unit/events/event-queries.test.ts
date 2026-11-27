import { describe, expect, it } from 'vitest';
import { GetEventQuery } from '../../../src/modules/events/application/queries/get-event.js';
import { ListEventsQuery } from '../../../src/modules/events/application/queries/list-events.js';
import { Event } from '../../../src/modules/events/domain/event.js';
import { NotFoundError } from '../../../src/shared/domain/errors.js';
import { InMemoryEventRepository } from './fakes.js';

async function seed(repo: InMemoryEventRepository) {
  for (let i = 1; i <= 5; i++) {
    const ev = Event.create({
      id: `e-${i}`,
      title: `Event ${i}`,
      description: `Description ${i}`,
      startsAt: new Date(Date.UTC(2026, 11, i, 10)),
      endsAt: new Date(Date.UTC(2026, 11, i, 14)),
      organizer: 'Org',
      venueId: i <= 2 ? 'v-1' : 'v-2',
      now: new Date(Date.UTC(2026, 10, 1)),
    });
    if (i >= 4) ev.publish(true);
    await repo.add(ev);
  }
}

describe('Events queries (ES-19)', () => {
  it('returns empty page with defaults', async () => {
    const repo = new InMemoryEventRepository();
    expect(await new ListEventsQuery(repo).execute()).toEqual({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    });
  });

  it('paginates and filters events by venueId and status', async () => {
    const repo = new InMemoryEventRepository();
    await seed(repo);
    const query = new ListEventsQuery(repo);

    const p1 = await query.execute({ page: 1, limit: 2 });
    expect(p1.items.map((e) => e.id)).toEqual(['e-5', 'e-4']);
    expect(p1).toMatchObject({ total: 5, totalPages: 3 });

    const byVenue = await query.execute({ venueId: 'v-1' });
    expect(byVenue.items.map((e) => e.id)).toEqual(['e-2', 'e-1']);

    const byStatus = await query.execute({ status: 'ACTIVE' });
    expect(byStatus.items.map((e) => e.id)).toEqual(['e-5', 'e-4']);
  });

  it('returns event details by id or throws NotFoundError', async () => {
    const repo = new InMemoryEventRepository();
    await seed(repo);
    const query = new GetEventQuery(repo);

    expect(await query.execute('e-1')).toMatchObject({ id: 'e-1', title: 'Event 1' });
    await expect(query.execute('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
