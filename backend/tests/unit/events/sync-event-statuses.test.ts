import { describe, expect, it } from 'vitest';
import type {
  FinishableEvent,
  IEventLifecycleRepository,
} from '../../../src/modules/events/index.js';
import { SyncEventStatusesUseCase } from '../../../src/modules/events/application/use-cases/sync-event-statuses.js';
import { immediateUow } from '../auth/fakes.js';

/** Minimal stand-in for the Event entity of ES-17. */
class FakeEvent implements FinishableEvent {
  status: 'ACTIVE' | 'FINISHED' = 'ACTIVE';
  constructor(
    readonly id: string,
    readonly endsAt: Date,
    private readonly broken = false,
  ) {}
  finish() {
    if (this.broken) throw new Error('invariant violated');
    this.status = 'FINISHED';
  }
}

class FakeRepo implements IEventLifecycleRepository {
  saved: string[] = [];
  constructor(public events: FakeEvent[]) {}
  async findActiveEndedBefore(now: Date) {
    return this.events.filter((e) => e.status === 'ACTIVE' && e.endsAt <= now);
  }
  async save(e: FinishableEvent) {
    this.saved.push(e.id);
  }
}

const NOW = new Date('2026-11-21T12:00:00Z');
const clock = { now: () => NOW };

describe('SyncEventStatusesUseCase', () => {
  it('finishes only ACTIVE events whose end time has passed', async () => {
    const past = new FakeEvent('past', new Date('2026-11-21T11:00:00Z'));
    const future = new FakeEvent('future', new Date('2026-11-21T13:00:00Z'));
    const repo = new FakeRepo([past, future]);

    const result = await new SyncEventStatusesUseCase(repo, immediateUow, clock).execute();

    expect(result).toEqual({ finished: 1, failed: 0 });
    expect(past.status).toBe('FINISHED');
    expect(future.status).toBe('ACTIVE');
    expect(repo.saved).toEqual(['past']);
  });

  it('is idempotent: a second run does nothing', async () => {
    const repo = new FakeRepo([new FakeEvent('past', new Date('2026-11-20T00:00:00Z'))]);
    const sync = new SyncEventStatusesUseCase(repo, immediateUow, clock);
    await sync.execute();
    expect(await sync.execute()).toEqual({ finished: 0, failed: 0 });
    expect(repo.saved).toEqual(['past']);
  });

  it('one broken event does not stop the others', async () => {
    const repo = new FakeRepo([
      new FakeEvent('bad', new Date('2026-11-20T00:00:00Z'), true),
      new FakeEvent('good', new Date('2026-11-20T00:00:00Z')),
    ]);
    const result = await new SyncEventStatusesUseCase(repo, immediateUow, clock).execute();
    expect(result).toEqual({ finished: 1, failed: 1 });
    expect(repo.saved).toEqual(['good']);
  });
});
