/**
 * Port: transaction boundary for use cases (declared in application,
 * implemented in infrastructure).
 *
 * Repositories used inside `run` automatically join the current transaction.
 */
export interface IUnitOfWork {
  /** Executes `work` atomically: COMMIT on success, ROLLBACK on throw. Nested calls join the outer transaction. */
  run<T>(work: () => Promise<T>): Promise<T>;

  /**
   * Schedules a side effect (e.g. publishing a domain event) to run
   * asynchronously AFTER a successful COMMIT. Dropped on ROLLBACK.
   * Errors in callbacks never affect the main operation.
   */
  afterCommit(callback: () => void | Promise<void>): void;
}
