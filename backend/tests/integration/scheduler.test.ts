import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createEventsModule,
  SYNC_EVENT_STATUSES_JOB,
  type FinishableEvent,
} from '../../src/modules/events/index.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

describe('Scheduler wiring: sync-event-statuses job', () => {
  let t: TestApp;
  const finished: string[] = [];
  const pastEvent: FinishableEvent = {
    id: 'ev-1',
    finish: () => void finished.push('ev-1'),
  };
  let pending = [pastEvent];

  beforeAll(async () => {
    t = await createTestApp({}, [
      createEventsModule({
        lifecycle: {
          findActiveEndedBefore: async () => pending,
          save: async () => {
            pending = [];
          },
        },
      }),
    ]);
    await t.app.ready();
  });
  afterAll(() => t.close());

  it('is registered by the Events module and finishes past events', async () => {
    expect(await t.app.scheduler.runNow(SYNC_EVENT_STATUSES_JOB)).toEqual({
      finished: 1,
      failed: 0,
    });
    expect(finished).toEqual(['ev-1']);
  });

  it('second run is a no-op (idempotent)', async () => {
    expect(await t.app.scheduler.runNow(SYNC_EVENT_STATUSES_JOB)).toEqual({
      finished: 0,
      failed: 0,
    });
  });

  it('HTTP keeps answering while the job runs', async () => {
    const [res] = await Promise.all([
      t.app.inject({ method: 'GET', url: '/health' }),
      t.app.scheduler.runNow(SYNC_EVENT_STATUSES_JOB),
    ]);
    expect(res.statusCode).toBe(200);
  });
});
