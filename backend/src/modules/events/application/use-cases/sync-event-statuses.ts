import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import type { IEventLifecycleRepository } from '../ports/event-lifecycle-repository.js';

export interface SyncEventStatusesResult {
  [key: string]: unknown;
  finished: number;
  failed: number;
}

export interface Clock {
  now(): Date;
}

/**
 * Command (background): moves ACTIVE events whose end time has passed to FINISHED.
 * Idempotent — a second run finds nothing to do. Each event is finished in its
 * own transaction, so one broken event does not block the others.
 */
export class SyncEventStatusesUseCase {
  constructor(
    private readonly events: IEventLifecycleRepository,
    private readonly uow: IUnitOfWork,
    private readonly clock: Clock = { now: () => new Date() },
  ) {}

  async execute(): Promise<SyncEventStatusesResult> {
    const now = this.clock.now();
    const candidates = await this.events.findActiveEndedBefore(now);

    let finished = 0;
    let failed = 0;
    for (const candidate of candidates) {
      try {
        await this.uow.run(async () => {
          candidate.finish(now);
          await this.events.save(candidate);
        });
        finished++;
      } catch {
        failed++;
      }
    }
    return { finished, failed };
  }
}
