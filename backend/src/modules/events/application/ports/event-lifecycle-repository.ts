/**
 * Minimal view of the Event aggregate the scheduler needs.
 * The real `Event` entity (ES-17) satisfies it with its own `finish()` method,
 * which enforces the state machine (only ACTIVE → FINISHED).
 */
export interface FinishableEvent {
  readonly id: string;
  finish(now: Date): void;
}

/** Port: access to events whose end time has passed. */
export interface IEventLifecycleRepository {
  /** ACTIVE events with `endsAt <= now`, locked for update inside a UoW. */
  findActiveEndedBefore(now: Date): Promise<FinishableEvent[]>;
  save(event: FinishableEvent): Promise<void>;
}
