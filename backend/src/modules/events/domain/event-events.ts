import type { DomainEvent } from '../../../shared/application/event-bus.js';

/** Integration events published by the Events module (after COMMIT). */

export interface EventCancelled extends DomainEvent<'EventCancelled'> {
  eventId: string;
}
