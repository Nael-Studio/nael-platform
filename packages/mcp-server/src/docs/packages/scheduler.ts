import type { PackageDocumentation } from '../../types';

export const schedulerDocumentation: PackageDocumentation = {
  name: '@nl-framework/scheduler',
  version: '0.1.7',
  description:
    'Decorator-driven scheduling powered by Bun workers. Supports cron expressions, fixed intervals, and one-off timeouts that run outside the main event loop for accuracy.',
  installation: 'bun add @nl-framework/scheduler',
  features: [
    {
      title: 'Cron, Interval, and Timeout Decorators',
      description:
        'Attach `@Cron`, `@Interval`, or `@Timeout` to class methods to declare recurring work alongside your other providers.',
      icon: '⏰',
    },
    {
      title: 'Worker-Based Isolation',
      description:
        'Jobs execute in a dedicated Bun worker, keeping the primary event loop responsive and avoiding timer drift.',
      icon: '🧵',
    },
    {
      title: 'Dynamic Registration API',
      description:
        'Use `SchedulerService` to register, cancel, or introspect tasks programmatically at runtime.',
      icon: '🛠️',
    },
  ],
  quickStart: {
    description:
      'Import the scheduler module, decorate a provider, and register it inside your feature module.',
    steps: [
      'Import `SchedulerModule` into your feature module and add it to the `imports` array.',
      'Create an injectable service, decorate methods with `@Cron`, `@Interval`, or `@Timeout`, and implement `OnModuleInit` to call `registerDecoratedTarget`.',
      'Inject `SchedulerService` wherever you need dynamic registration or cancellation of jobs.',
    ],
    code: `import { Injectable, Module, OnModuleInit } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';
import { Cron, Interval, SchedulerModule, SchedulerService } from '@nl-framework/scheduler';

@Injectable()
class ReportScheduler implements OnModuleInit {
  constructor(private readonly scheduler: SchedulerService, private readonly logger: Logger) {}

  @Cron('*/15 * * * * *', { name: 'reports.cron', runOnInit: true })
  async exportSummary() {
    this.logger.info('Exporting summary report');
  }

  @Interval(60000, { name: 'reports.cleanup' })
  async cleanup() {
    this.logger.info('Cleaning up temporary files');
  }

  async onModuleInit() {
    await this.scheduler.registerDecoratedTarget(this);
  }
}

@Module({
  imports: [SchedulerModule],
  providers: [ReportScheduler],
})
export class ReportsModule {}
`,
  },
  api: {
    decorators: [
      {
        name: '@Cron',
        signature: `@Cron(expression: string, options?: CronDecoratorOptions): MethodDecorator`,
        description:
          'Schedule a method using a cron expression. Supports optional names, timezones, and immediate execution.',
        parameters: [
          {
            name: 'expression',
            type: 'string',
            description: 'A standard cron expression evaluated by `cron-parser`.',
            required: true,
          },
          {
            name: 'options',
            type: 'CronDecoratorOptions',
            description: 'Optional name, timezone, max run count, and `runOnInit` flag.',
            required: false,
          },
        ],
      },
      {
        name: '@Interval',
        signature:
          '@Interval(milliseconds: number, options?: IntervalDecoratorOptions): MethodDecorator',
        description: 'Run a handler on a fixed interval with optional naming and execution limits.',
      },
      {
        name: '@Timeout',
        signature:
          '@Timeout(milliseconds: number, options?: TimeoutDecoratorOptions): MethodDecorator',
        description: 'Schedule a one-off execution after the provided delay.',
      },
    ],
    classes: [
      {
        name: 'SchedulerService',
        description: 'Runtime API for registering and cancelling scheduled jobs.',
        methods: [
          {
            name: 'registerDecoratedTarget',
            signature: 'registerDecoratedTarget(target: object): Promise<void>',
            description: 'Scan an instance for decorator metadata and register all declared jobs.',
          },
          {
            name: 'scheduleInterval',
            signature:
              'scheduleInterval(name: string, handler: SchedulerHandler, options: IntervalOptions): Promise<ScheduledHandle>',
            description:
              'Programmatically register an interval-based job and receive a cancellable handle.',
          },
          {
            name: 'cancel',
            signature: 'cancel(id: string): Promise<void>',
            description: 'Stop a previously scheduled job by its identifier.',
          },
        ],
      },
      {
        name: 'SchedulerRegistry',
        description: 'In-memory registry of registered cron jobs, intervals, and timeouts.',
        methods: [
          {
            name: 'getCronJobs',
            signature: 'getCronJobs(): Map<string, ScheduledHandle>',
            description: 'Read-only map of cron jobs keyed by identifier.',
          },
          {
            name: 'clear',
            signature: 'clear(): void',
            description: 'Remove every registered job reference, typically during shutdown.',
          },
        ],
      },
    ],
    interfaces: [
      {
        name: 'CronOptions',
        description:
          'Options for cron-based tasks accepted by the scheduler service and decorators.',
        properties: [
          {
            name: 'cron',
            type: 'string',
            description: 'Cron expression describing the schedule.',
            required: true,
          },
          {
            name: 'name',
            type: 'string',
            description: 'Friendly identifier for the task.',
            required: false,
          },
          {
            name: 'timezone',
            type: 'string',
            description: 'IANA timezone name to evaluate the cron expression in.',
            required: false,
          },
          {
            name: 'runOnInit',
            type: 'boolean',
            description: 'Whether to execute the handler immediately after registration.',
            required: false,
          },
          {
            name: 'maxRuns',
            type: 'number',
            description: 'Maximum number of executions before automatic cancellation.',
            required: false,
          },
        ],
      },
    ],
  },
  examples: [
    {
      title: 'Dynamic pulse registration',
      description:
        'Register an ad-hoc interval from another provider during runtime to support feature flags or user-driven scheduling.',
      code: `await scheduler.scheduleInterval('reports.dynamic-pulse', async () => {
  logger.debug('Pulse check from runtime job');
}, {
  interval: 7000,
  maxRuns: 3,
  runOnInit: true,
});
`,
      explanation:
        'Combine decorator-based tasks with dynamic handles for flexible scheduling topologies.',
      tags: ['dynamic', 'interval'],
    },
  ],
  bestPractices: [
    {
      category: 'Reliability',
      do: [
        {
          title: 'Use descriptive task names',
          description:
            'Names surface within the registry and logs, making it easy to trace execution histories.',
        },
        {
          title: 'Guard handlers with try/catch',
          description:
            'Wrap scheduled logic to handle transient failures and emit structured logs for observability.',
        },
      ],
      dont: [
        {
          title: 'Block within handlers',
          description:
            'Avoid heavy synchronous work; delegate to async services to keep workers responsive.',
        },
      ],
    },
  ],
  troubleshooting: [
    {
      issue: 'Scheduled tasks never execute',
      symptoms: ['Jobs remain registered but no log entries appear', 'Worker is not spawned'],
      solution:
        'Verify `SchedulerModule` is imported and that your root module enables `emitDecoratorMetadata`. Ensure at least one provider registers decorated targets during initialization.',
      relatedTopics: ['SchedulerModule', 'Decorators'],
    },
    {
      issue: 'Handlers execute twice on startup',
      symptoms: ['Immediate execution followed by scheduled run'],
      solution:
        'Disable the `runOnInit` flag or ensure your handler is idempotent when eager execution is desired.',
      relatedTopics: ['CronOptions'],
    },
  ],
  relatedPackages: ['@nl-framework/core', '@nl-framework/logger'],
};
