import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { DomainEvent } from '../../src/shared/application/event-bus.js';
import type { Database } from '../../src/shared/infrastructure/db/database.js';
import { DrizzleUnitOfWork } from '../../src/shared/infrastructure/db/unit-of-work.js';
import { InProcessEventBus } from '../../src/shared/infrastructure/in-process-event-bus.js';
import { createTestDatabase } from '../helpers/test-db.js';

interface Pinged extends DomainEvent<'Pinged'> {
  payload: { n: number };
}
const ping = (n: number): Pinged => ({ type: 'Pinged', occurredAt: new Date(), payload: { n } });
const settle = async () => {
  for (let i = 0; i < 3; i++) await new Promise((r) => setImmediate(r));
};

describe('InProcessEventBus', () => {
  let db: Database;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ db, close } = await createTestDatabase());
  });
  afterAll(() => close());

  const setup = () => {
    const uow = new DrizzleUnitOfWork(db, () => {});
    const errors = vi.fn();
    const bus = new InProcessEventBus(uow, errors);
    return { uow, bus, errors };
  };

  it('delivers events to subscribers only after COMMIT', async () => {
    const { uow, bus } = setup();
    const handler = vi.fn();
    bus.subscribe<Pinged>('Pinged', handler);

    await uow.run(async () => {
      bus.publish(ping(1));
      await settle();
      expect(handler).not.toHaveBeenCalled(); // still inside the transaction
    });
    await settle();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ payload: { n: 1 } }));
  });

  it('drops events published in a rolled back transaction', async () => {
    const { uow, bus } = setup();
    const handler = vi.fn();
    bus.subscribe<Pinged>('Pinged', handler);
    await uow
      .run(async () => {
        bus.publish(ping(2));
        throw new Error('rollback');
      })
      .catch(() => {});
    await settle();
    expect(handler).not.toHaveBeenCalled();
  });

  it('a failing subscriber does not affect the publisher or other subscribers', async () => {
    const { uow, bus, errors } = setup();
    const healthy = vi.fn();
    bus.subscribe<Pinged>('Pinged', () => {
      throw new Error('analytics down');
    });
    bus.subscribe<Pinged>('Pinged', healthy);

    const result = await uow.run(async () => {
      bus.publish(ping(3));
      return 'sold';
    });
    await settle();
    expect(result).toBe('sold');
    expect(healthy).toHaveBeenCalledOnce();
    expect(errors).toHaveBeenCalledOnce();
  });

  it('events are immutable', async () => {
    const { bus } = setup();
    let received: Pinged | undefined;
    bus.subscribe<Pinged>('Pinged', (e) => {
      received = e;
    });
    bus.publish(ping(4));
    await settle();
    expect(Object.isFrozen(received)).toBe(true);
    expect(Object.isFrozen(received?.payload)).toBe(true);
  });
});
