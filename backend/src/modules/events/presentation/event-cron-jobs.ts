import type { IScheduler } from '../../../shared/application/scheduler.js';
import type { SyncEventStatusesUseCase } from '../application/use-cases/sync-event-statuses.js';

export const SYNC_EVENT_STATUSES_JOB = 'sync-event-statuses';

/** Every 30 minutes (LR2 §4.2): finish past events. */
export const SYNC_EVENT_STATUSES_CRON = '*/30 * * * *';

/** Cron trigger = presentation layer: it only invokes the use case. */
export function registerEventCronJobs(scheduler: IScheduler, sync: SyncEventStatusesUseCase): void {
  scheduler.schedule(SYNC_EVENT_STATUSES_JOB, SYNC_EVENT_STATUSES_CRON, () => sync.execute());
}
