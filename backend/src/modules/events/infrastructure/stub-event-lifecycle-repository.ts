import type {
  FinishableEvent,
  IEventLifecycleRepository,
} from '../application/ports/event-lifecycle-repository.js';

/**
 * TEMPORARY stand-in until the events table and Event entity exist (ES-17).
 * Replace with a Drizzle repository:
 *   SELECT … FROM events WHERE status = 'ACTIVE' AND ends_at <= $1 FOR UPDATE SKIP LOCKED
 */
export class StubEventLifecycleRepository implements IEventLifecycleRepository {
  async findActiveEndedBefore(_now: Date): Promise<FinishableEvent[]> {
    return [];
  }
  async save(_event: FinishableEvent): Promise<void> {}
}
