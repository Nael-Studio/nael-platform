import 'reflect-metadata';
import { Application, Injectable, Module, type OnModuleDestroy, type OnModuleInit } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';
import {
  Cron,
  Interval,
  Timeout,
  SchedulerModule,
  SchedulerRegistry,
  SchedulerService,
} from '@nl-framework/scheduler';

@Injectable()
class ReportScheduler implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly scheduler: SchedulerService,
    private readonly registry: SchedulerRegistry,
    private readonly logger: Logger,
  ) {}

  @Cron('*/15 * * * * *', { name: 'reports.cron', runOnInit: true })
  async exportSummary(): Promise<void> {
    this.logger.info('Cron: exporting summary report');
  }

  @Interval(5000, { name: 'reports.metric-poll', maxRuns: 5 })
  async pollMetrics(): Promise<void> {
    this.logger.debug('Interval: polling external metrics');
  }

  @Timeout(2000, { name: 'reports.initial-warmup' })
  async warmup(): Promise<void> {
    this.logger.info('Timeout: warmup task finished');
  }

  async onModuleInit(): Promise<void> {
    this.logger.info('Registering decorated scheduler tasks');
    await this.scheduler.registerDecoratedTarget(this);

    const cronJobs = Array.from(this.registry.getCronJobs().keys());
    const intervals = Array.from(this.registry.getIntervals().keys());
    const timeouts = Array.from(this.registry.getTimeouts().keys());

    this.logger.info('Registered jobs', {
      cron: cronJobs,
      intervals,
      timeouts,
    });

    await this.scheduler.scheduleInterval(
      'reports.dynamic-pulse',
      async () => {
        this.logger.debug('Dynamic interval: pulse check');
      },
      {
        interval: 7000,
        maxRuns: 3,
        runOnInit: true,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.info('ReportScheduler shutting down');
    await this.scheduler.cancel('reports.dynamic-pulse');
  }
}

@Module({
  imports: [SchedulerModule],
  providers: [ReportScheduler],
})
class SchedulerExampleModule {}

async function bootstrap(): Promise<void> {
  const application = new Application();
  const context = await application.bootstrap(SchedulerExampleModule, {
    logger: {
      level: 'DEBUG',
    },
  });

  const logger = context.getLogger();
  logger.info('Scheduler example running. Press Ctrl+C to exit.');

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.warn('Received shutdown signal', { signal });
    await context.close();
    logger.info('Scheduler example stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
