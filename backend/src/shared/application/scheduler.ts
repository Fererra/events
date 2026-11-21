/** Result a job may report; it is written to the log after every run. */
export type JobResult = Record<string, unknown> | void;

export type Job = () => Promise<JobResult>;

/**
 * Port: background jobs (node-cron in infrastructure).
 * Jobs run outside of HTTP requests and never overlap with themselves.
 */
export interface IScheduler {
  /** Registers a job; it starts ticking on `start()`. */
  schedule(name: string, cronExpression: string, job: Job): void;
  /** Runs a registered job immediately (tests, manual trigger). */
  runNow(name: string): Promise<JobResult>;
  start(): void;
  stop(): Promise<void>;
}
