import { afterEach, describe, expect, it, vi } from 'vitest';
import { NodeCronScheduler } from '../../src/shared/infrastructure/node-cron-scheduler.js';

const logger = () => ({ info: vi.fn(), error: vi.fn() });

describe('NodeCronScheduler', () => {
  let scheduler: NodeCronScheduler | undefined;
  afterEach(async () => {
    await scheduler?.stop();
  });

  it('logs the result of every run', async () => {
    const log = logger();
    scheduler = new NodeCronScheduler(log);
    scheduler.schedule('demo', '*/30 * * * *', async () => ({ finished: 3 }));

    expect(await scheduler.runNow('demo')).toEqual({ finished: 3 });
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'demo', result: { finished: 3 } }),
      'job finished',
    );
  });

  it('a failing job is logged and does not throw', async () => {
    const log = logger();
    scheduler = new NodeCronScheduler(log);
    scheduler.schedule('boom', '*/30 * * * *', async () => {
      throw new Error('db down');
    });
    await expect(scheduler.runNow('boom')).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ job: 'boom' }), 'job failed');
  });

  it('rejects invalid cron expressions and duplicate names', () => {
    scheduler = new NodeCronScheduler(logger());
    expect(() => scheduler!.schedule('x', 'not a cron', async () => {})).toThrow(/Invalid cron/);
    scheduler.schedule('y', '*/30 * * * *', async () => {});
    expect(() => scheduler!.schedule('y', '*/30 * * * *', async () => {})).toThrow(/already/);
  });

  it('ticks on schedule after start()', async () => {
    scheduler = new NodeCronScheduler(logger());
    const job = vi.fn(async () => {});
    scheduler.schedule('every-second', '* * * * * *', job);
    await new Promise((r) => setTimeout(r, 1200));
    expect(job).not.toHaveBeenCalled(); // not started yet
    scheduler.start();
    await new Promise((r) => setTimeout(r, 2200));
    expect(job).toHaveBeenCalled();
  });
});
