/** Base shape of a domain event: immutable fact that happened in a module. */
export interface DomainEvent<TType extends string = string> {
  readonly type: TType;
  readonly occurredAt: Date;
}

export type EventHandler<E extends DomainEvent> = (event: E) => void | Promise<void>;

/**
 * Port: in-process Domain Event Bus (LR2 §5).
 * - `publish` inside a UnitOfWork delivers the event only after COMMIT;
 * - delivery is asynchronous — the HTTP response does not wait for subscribers;
 * - a failing subscriber never affects the publisher or other subscribers.
 */
export interface IEventBus {
  publish(event: DomainEvent): void;
  subscribe<E extends DomainEvent>(type: E['type'], handler: EventHandler<E>): void;
}
