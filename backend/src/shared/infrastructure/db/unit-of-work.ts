import { AsyncLocalStorage } from 'node:async_hooks';
import type { IUnitOfWork } from '../../application/unit-of-work.js';
import type { Database, DbExecutorProvider } from './database.js';

type Callback = () => void | Promise<void>;
type ErrorLogger = (err: unknown) => void;

interface Scope {
  tx: Database;
  afterCommit: Callback[];
}

/**
 * IUnitOfWork on top of Drizzle transactions.
 * The active transaction is kept in AsyncLocalStorage, so repositories
 * call `executor()` and transparently join it — use cases never see ORM types.
 */
export class DrizzleUnitOfWork implements IUnitOfWork, DbExecutorProvider {
  private readonly storage = new AsyncLocalStorage<Scope>();

  constructor(
    private readonly db: Database,
    private readonly onCallbackError: ErrorLogger = (err) =>
      console.error('afterCommit callback failed', err),
  ) {}

  executor(): Database {
    return this.storage.getStore()?.tx ?? this.db;
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.storage.getStore()) return work(); // nested → join outer transaction

    const afterCommit: Callback[] = [];
    const result = await this.db.transaction((tx) =>
      this.storage.run({ tx: tx as Database, afterCommit }, work),
    );
    afterCommit.forEach((cb) => this.schedule(cb));
    return result;
  }

  afterCommit(callback: Callback): void {
    const scope = this.storage.getStore();
    if (scope) scope.afterCommit.push(callback);
    else this.schedule(callback); // no transaction → nothing to wait for
  }

  private schedule(callback: Callback): void {
    // Detach from the request: the HTTP response does not wait for side effects.
    setImmediate(() => {
      this.storage.exit(() => {
        Promise.resolve()
          .then(callback)
          .catch((err: unknown) => this.onCallbackError(err));
      });
    });
  }
}
