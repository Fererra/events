import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Event } from '../../src/modules/events/domain/event.js';
import { SYNC_EVENT_STATUSES_JOB } from '../../src/modules/events/index.js';
import { DrizzleEventRepository } from '../../src/modules/events/infrastructure/drizzle-event-repository.js';
import { DrizzleUnitOfWork } from '../../src/shared/infrastructure/db/unit-of-work.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

const VENUE_ID = '11111111-1111-4111-8111-111111111111';

describe('Events persistence & scheduler integration on PGlite', () => {
  let t: TestApp;
  let repo: DrizzleEventRepository;

  beforeAll(async () => {
    t = await createTestApp();
    await t.app.ready();
    repo = new DrizzleEventRepository(new DrizzleUnitOfWork(t.db));
  });
  afterAll(() => t.close());

  it('persists events and scheduler transitions only past ACTIVE events to FINISHED', async () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 3_600_000);
    const oneHourAgo = new Date(now.getTime() - 3_600_000);
    const inOneHour = new Date(now.getTime() + 3_600_000);
    const inTwoHours = new Date(now.getTime() + 2 * 3_600_000);

    const pastActive = Event.create({
      id: crypto.randomUUID(),
      title: 'Past Active',
      description: 'Should finish',
      startsAt: twoHoursAgo,
      endsAt: oneHourAgo,
      organizer: 'Org',
      venueId: VENUE_ID,
      now: twoHoursAgo,
    });
    pastActive.publish(true);

    const futureActive = Event.create({
      id: crypto.randomUUID(),
      title: 'Future Active',
      description: 'Still running',
      startsAt: inOneHour,
      endsAt: inTwoHours,
      organizer: 'Org',
      venueId: VENUE_ID,
      now,
    });
    futureActive.publish(true);

    const pastPlanning = Event.create({
      id: crypto.randomUUID(),
      title: 'Past Planning',
      description: 'Never published',
      startsAt: twoHoursAgo,
      endsAt: oneHourAgo,
      organizer: 'Org',
      venueId: VENUE_ID,
      now: twoHoursAgo,
    });

    await repo.add(pastActive);
    await repo.add(futureActive);
    await repo.add(pastPlanning);

    const firstRun = await t.app.scheduler.runNow(SYNC_EVENT_STATUSES_JOB);
    expect(firstRun).toEqual({ finished: 1, failed: 0 });

    expect((await repo.findById(pastActive.id))?.status).toBe('FINISHED');
    expect((await repo.findById(futureActive.id))?.status).toBe('ACTIVE');
    expect((await repo.findById(pastPlanning.id))?.status).toBe('IN_PLANNING');
    expect(await repo.findById('00000000-0000-4000-8000-000000000000')).toBeNull();

    const secondRun = await t.app.scheduler.runNow(SYNC_EVENT_STATUSES_JOB);
    expect(secondRun).toEqual({ finished: 0, failed: 0 });
  });
});
