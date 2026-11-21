import type { DomainEvent, EventHandler, IEventBus } from '../application/event-bus.js';
import type { IUnitOfWork } from '../application/unit-of-work.js';

type ErrorLogger = (err: unknown, event: DomainEvent) => void;

/** Deep-freezes the event so subscribers cannot mutate a shared fact. */
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value) && !(value instanceof Date)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** IEventBus on top of IUnitOfWork.afterCommit — no broker, single process. */
export class InProcessEventBus implements IEventBus {
  private readonly handlers = new Map<string, EventHandler<DomainEvent>[]>();

  constructor(
    private readonly uow: IUnitOfWork,
    private readonly onHandlerError: ErrorLogger = (err, event) =>
      console.error(`event handler for ${event.type} failed`, err),
  ) {}

  subscribe<E extends DomainEvent>(type: E['type'], handler: EventHandler<E>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as EventHandler<DomainEvent>);
    this.handlers.set(type, list);
  }

  publish(event: DomainEvent): void {
    const frozen = freeze(event);
    this.uow.afterCommit(() => this.dispatch(frozen));
  }

  private async dispatch(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (err) {
          this.onHandlerError(err, event);
        }
      }),
    );
  }
}
