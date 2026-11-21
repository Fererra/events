import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import type { Database } from '../../src/shared/infrastructure/db/database.js';
import { DrizzleUnitOfWork } from '../../src/shared/infrastructure/db/unit-of-work.js';
import { createTestDatabase } from '../helpers/test-db.js';
import { rowsOf } from '../helpers/test-app.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('DrizzleUnitOfWork', () => {
  let db: Database;
  let close: () => Promise<void>;
  let uow: DrizzleUnitOfWork;

  const count = async () => {
    const res = await uow.executor().execute(sql`select count(*)::int as n from uow_probe`);
    const rows = rowsOf<{ n: number }>(res);
    return rows[0]?.n ?? 0;
  };
  const insert = () => uow.executor().execute(sql`insert into uow_probe default values`);

  beforeAll(async () => {
    ({ db, close } = await createTestDatabase());
    await db.execute(sql`create table uow_probe (id serial primary key)`);
  });
  afterAll(() => close());
  beforeEach(async () => {
    uow = new DrizzleUnitOfWork(db, () => {});
    await db.execute(sql`truncate uow_probe`);
  });

  it('commits work on success', async () => {
    await uow.run(async () => {
      await insert();
      await insert();
    });
    expect(await count()).toBe(2);
  });

  it('rolls back all work when an error is thrown', async () => {
    await expect(
      uow.run(async () => {
        await insert();
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await count()).toBe(0);
  });

  it('nested run joins the outer transaction', async () => {
    await expect(
      uow.run(async () => {
        await uow.run(insert);
        throw new Error('outer fails');
      }),
    ).rejects.toThrow();
    expect(await count()).toBe(0);
  });

  it('runs afterCommit callbacks only after COMMIT and asynchronously', async () => {
    const cb = vi.fn();
    await uow.run(async () => {
      await insert();
      uow.afterCommit(cb);
      expect(cb).not.toHaveBeenCalled();
    });
    expect(cb).not.toHaveBeenCalled(); // response is not blocked by side effects
    await flush();
    expect(cb).toHaveBeenCalledOnce();
  });

  it('drops afterCommit callbacks on ROLLBACK', async () => {
    const cb = vi.fn();
    await uow
      .run(async () => {
        uow.afterCommit(cb);
        throw new Error('rollback');
      })
      .catch(() => {});
    await flush();
    expect(cb).not.toHaveBeenCalled();
  });

  it('isolates errors thrown by afterCommit callbacks', async () => {
    const onError = vi.fn();
    uow = new DrizzleUnitOfWork(db, onError);
    const result = await uow.run(async () => {
      uow.afterCommit(() => {
        throw new Error('subscriber failed');
      });
      return 'main result';
    });
    expect(result).toBe('main result');
    await flush();
    await flush();
    expect(onError).toHaveBeenCalledOnce();
  });
});
