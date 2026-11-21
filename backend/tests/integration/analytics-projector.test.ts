import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { EventStatsProjector } from '../../src/modules/analytics/application/handlers/event-stats-projector.js';
import { DrizzleEventStatsRepository } from '../../src/modules/analytics/infrastructure/drizzle-event-stats-repository.js';
import type { EventCancelled } from '../../src/modules/events/index.js';
import type {
  RegistrationCancelled,
  RegistrationCreated,
} from '../../src/modules/registrations/index.js';
import type { Database } from '../../src/shared/infrastructure/db/database.js';
import { DrizzleUnitOfWork } from '../../src/shared/infrastructure/db/unit-of-work.js';
import { InProcessEventBus } from '../../src/shared/infrastructure/in-process-event-bus.js';
import { createTestDatabase } from '../helpers/test-db.js';

const EVENT = '11111111-1111-4111-8111-111111111111';

const created = (n: number, at = new Date()): RegistrationCreated => ({
  type: 'RegistrationCreated',
  occurredAt: at,
  registrationId: `r${n}`,
  eventId: EVENT,
  userId: `u${n}`,
  ticketTypeId: 't1',
});
const cancelled = (n: number): RegistrationCancelled => ({
  type: 'RegistrationCancelled',
  occurredAt: new Date(),
  registrationId: `r${n}`,
  eventId: EVENT,
  userId: `u${n}`,
  cancelledBy: 'owner',
});
const eventCancelled = (): EventCancelled => ({
  type: 'EventCancelled',
  occurredAt: new Date(),
  eventId: EVENT,
});

const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 5));
};

describe('Analytics: event_stats projection from domain events', () => {
  let db: Database;
  let close: () => Promise<void>;
  let uow: DrizzleUnitOfWork;
  let bus: InProcessEventBus;
  let repo: DrizzleEventStatsRepository;
  const errors = vi.fn();

  beforeAll(async () => {
    ({ db, close } = await createTestDatabase());
  });
  afterAll(() => close());
  beforeEach(async () => {
    await db.execute(sql`truncate event_stats`);
    uow = new DrizzleUnitOfWork(db, () => {});
    bus = new InProcessEventBus(uow, errors);
    repo = new DrizzleEventStatsRepository(uow);
    new EventStatsProjector(repo, uow).subscribe(bus);
  });

  const stats = async () => (await repo.list()).find((s) => s.eventId === EVENT);

  it('counts registrations and cancellations, tracks last activity', async () => {
    const last = new Date('2026-11-20T12:00:00Z');
    bus.publish(created(1, new Date('2026-11-20T11:00:00Z')));
    await settle();
    bus.publish(created(2, last));
    await settle();
    bus.publish(cancelled(1));
    await settle();

    const s = await stats();
    expect(s?.registrationsCount).toBe(1);
    expect(s?.isCancelled).toBe(false);
    expect(s?.lastActivityAt?.getTime()).toBeGreaterThanOrEqual(last.getTime());
  });

  it('marks the event as cancelled', async () => {
    bus.publish(eventCancelled());
    await settle();
    expect((await stats())?.isCancelled).toBe(true);
  });

  it('does not lose updates under a burst of registrations', async () => {
    for (let i = 0; i < 20; i++) bus.publish(created(i));
    await settle();
    await settle();
    expect((await stats())?.registrationsCount).toBe(20);
  });

  it('is asynchronous: the publisher’s transaction is not slowed down or broken by Analytics', async () => {
    const failing = new InProcessEventBus(uow, errors);
    new EventStatsProjector(
      {
        getForUpdate: async () => {
          throw new Error('analytics DB down');
        },
        save: async () => {},
        list: async () => [],
      },
      uow,
    ).subscribe(failing);

    const result = await uow.run(async () => {
      failing.publish(created(99));
      return 'ticket sold';
    });
    expect(result).toBe('ticket sold');
    await settle();
    expect(errors).toHaveBeenCalled();
  });
});
