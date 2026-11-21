import type { IEventBus } from '../../../../shared/application/event-bus.js';
import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import type { EventCancelled } from '../../../events/index.js';
import type { RegistrationCancelled, RegistrationCreated } from '../../../registrations/index.js';
import type { EventStats } from '../../domain/event-stats.js';
import type { IEventStatsRepository } from '../../domain/event-stats-repository.js';

/**
 * Subscriber: keeps event_stats up to date from domain events.
 * Runs asynchronously after the publisher's COMMIT, in its own transaction,
 * so a failure here never blocks or rolls back ticket sales.
 */
export class EventStatsProjector {
  constructor(
    private readonly stats: IEventStatsRepository,
    private readonly uow: IUnitOfWork,
  ) {}

  subscribe(bus: IEventBus): void {
    bus.subscribe<RegistrationCreated>('RegistrationCreated', (e) => this.onRegistrationCreated(e));
    bus.subscribe<RegistrationCancelled>('RegistrationCancelled', (e) =>
      this.onRegistrationCancelled(e),
    );
    bus.subscribe<EventCancelled>('EventCancelled', (e) => this.onEventCancelled(e));
  }

  onRegistrationCreated(e: RegistrationCreated): Promise<void> {
    return this.update(e.eventId, (s) => s.recordRegistration(e.occurredAt));
  }

  onRegistrationCancelled(e: RegistrationCancelled): Promise<void> {
    return this.update(e.eventId, (s) => s.recordCancellation(e.occurredAt));
  }

  onEventCancelled(e: EventCancelled): Promise<void> {
    return this.update(e.eventId, (s) => s.markEventCancelled(e.occurredAt));
  }

  private update(eventId: string, change: (stats: EventStats) => void): Promise<void> {
    return this.uow.run(async () => {
      const stats = await this.stats.getForUpdate(eventId); // row lock → no lost updates
      change(stats);
      await this.stats.save(stats);
    });
  }
}
