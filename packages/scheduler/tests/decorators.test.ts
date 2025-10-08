import { describe, expect, it } from 'bun:test';
import { Cron, Interval, Timeout } from '../src/decorators';
import { getSchedulerMetadata } from '../src/metadata';
import type {
  CronTaskMetadata,
  IntervalTaskMetadata,
  TimeoutTaskMetadata,
} from '../src/types';

describe('Scheduler decorators', () => {
  it('stores metadata with default names', () => {
    class DemoService {
      @Cron('* * * * * *')
      cronTask(): void {}

      @Interval(1000)
      intervalTask(): void {}

      @Timeout(500)
      timeoutTask(): void {}
    }

    const metadata = getSchedulerMetadata(DemoService);
    expect(metadata).toHaveLength(3);

    const [cronMeta, intervalMeta, timeoutMeta] = metadata as [
      CronTaskMetadata,
      IntervalTaskMetadata,
      TimeoutTaskMetadata,
    ];
    expect(cronMeta.options.name).toBe('DemoService#cronTask');
    expect(intervalMeta.options.name).toBe('DemoService#intervalTask');
    expect(timeoutMeta.options.name).toBe('DemoService#timeoutTask');
  });

  it('preserves explicit names and extra options', () => {
    class CustomService {
      @Cron('* * * * * *', { name: 'cron', timezone: 'UTC', runOnInit: true })
      cronTask(): void {}

      @Interval(1000, { name: 'interval', maxRuns: 5 })
      intervalTask(): void {}

      @Timeout(200, { name: 'timeout', runOnInit: true })
      timeoutTask(): void {}
    }

    const metadata = getSchedulerMetadata(CustomService) as [
      CronTaskMetadata,
      IntervalTaskMetadata,
      TimeoutTaskMetadata,
    ];

    expect(metadata.map((m) => m.options.name)).toEqual(['cron', 'interval', 'timeout']);
    expect(metadata[0].options.timezone).toBe('UTC');
    expect(metadata[1].options.maxRuns).toBe(5);
    expect(metadata[2].options.runOnInit).toBe(true);
  });
});
