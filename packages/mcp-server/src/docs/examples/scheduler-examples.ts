import type { ExampleCatalogEntry } from '../../types';

export const schedulerExamples: ExampleCatalogEntry[] = [
  {
    id: 'scheduler-module',
    category: 'scheduler',
    title: 'Cron and Interval Scheduler Module',
    description: 'Demonstrates decorator-based cron jobs, interval polling, and dynamic registrations backed by Bun workers.',
    code: `import { Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';
import { Cron, Interval, SchedulerModule, SchedulerRegistry, SchedulerService } from '@nl-framework/scheduler';

@Injectable()
class ReportScheduler implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly scheduler: SchedulerService,
    private readonly registry: SchedulerRegistry,
    private readonly logger: Logger,
  ) {}

  @Cron('*/15 * * * * *', { name: 'reports.cron', runOnInit: true })
  async exportSummary() {
    this.logger.info('Cron: exporting summary report');
  }

  @Interval(5000, { name: 'reports.metric-poll', maxRuns: 5 })
  async pollMetrics() {
    this.logger.debug('Interval: polling external metrics');
  }

  async onModuleInit() {
    await this.scheduler.registerDecoratedTarget(this);

    await this.scheduler.scheduleInterval('reports.dynamic-pulse', async () => {
      this.logger.debug('Dynamic interval: pulse check');
    }, {
      interval: 7000,
      maxRuns: 3,
      runOnInit: true,
    });
  }

  async onModuleDestroy() {
    await this.scheduler.cancel('reports.dynamic-pulse');
  }
}

@Module({
  imports: [SchedulerModule],
  providers: [ReportScheduler],
})
export class SchedulerExampleModule {}
`,
    explanation:
      'Run `bun run --filter @nl-framework/example-scheduler start` in the monorepo to watch jobs executing with structured logs.',
    tags: ['scheduler', 'cron', 'workers'],
    relatedPackages: ['@nl-framework/scheduler', '@nl-framework/core', '@nl-framework/logger'],
  },
];
