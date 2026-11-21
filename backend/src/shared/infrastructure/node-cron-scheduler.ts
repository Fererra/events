import cron, { type ScheduledTask } from 'node-cron';
import type { IScheduler, Job, JobResult } from '../application/scheduler.js';

export interface SchedulerLogger {
  info(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
}

interface Entry {
  job: Job;
  task: ScheduledTask;
}

/**
 * IScheduler on node-cron. Every run is logged with its duration and result;
 * a failing run is logged and does not stop the schedule. `noOverlap`
 * guarantees a slow run is never executed twice in parallel.
 */
export class NodeCronScheduler implements IScheduler {
  private readonly entries = new Map<string, Entry>();
  private started = false;

  constructor(private readonly log: SchedulerLogger) {}

  schedule(name: string, cronExpression: string, job: Job): void {
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression for job "${name}": ${cronExpression}`);
    }
    if (this.entries.has(name)) throw new Error(`Job "${name}" is already scheduled`);

    const task = cron.createTask(cronExpression, () => this.run(name, job), {
      name,
      noOverlap: true,
    });
    this.entries.set(name, { job, task });
    if (this.started) void task.start();
  }

  runNow(name: string): Promise<JobResult> {
    const entry = this.entries.get(name);
    if (!entry) throw new Error(`Unknown job "${name}"`);
    return this.run(name, entry.job);
  }

  start(): void {
    this.started = true;
    for (const { task } of this.entries.values()) void task.start();
  }

  async stop(): Promise<void> {
    this.started = false;
    await Promise.all([...this.entries.values()].map(({ task }) => task.destroy()));
    this.entries.clear();
  }

  private async run(name: string, job: Job): Promise<JobResult> {
    const startedAt = Date.now();
    try {
      const result = await job();
      this.log.info({ job: name, durationMs: Date.now() - startedAt, result }, 'job finished');
      return result;
    } catch (err) {
      this.log.error({ job: name, durationMs: Date.now() - startedAt, err }, 'job failed');
      return undefined;
    }
  }
}
