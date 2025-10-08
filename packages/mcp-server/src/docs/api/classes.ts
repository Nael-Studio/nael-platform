import type { ApiClassEntry } from '../../types';

export const classReference: ApiClassEntry[] = [
  {
    name: 'Application',
    description: 'Bootstrapper that manages the DI container and lifecycle hooks.',
    methods: [
      {
        name: 'create',
        signature: 'static create(rootModule: ClassType, options?: ApplicationOptions): Promise<Application>',
        description: 'Instantiate the application given a root module.',
      },
      {
        name: 'init',
        signature: 'init(): Promise<void>',
        description: 'Trigger lifecycle hooks and mark the app as ready.',
      },
    ],
  },
  {
    name: 'Logger',
    description: 'Structured logger instance.',
    methods: [
      {
        name: 'info',
        signature: 'info(message: string, metadata?: Record<string, unknown>): void',
        description: 'Log an informational message.',
      },
    ],
  },
  {
    name: 'ConfigService',
    description: 'Typed configuration accessor.',
    methods: [
      {
        name: 'get',
        signature: 'get<T>(path: string, defaultValue?: T): T',
        description: 'Retrieve configuration values using dot notation.',
      },
    ],
  },
  {
    name: 'SchedulerService',
    description: 'Register cron, interval, and timeout jobs backed by Bun workers.',
    methods: [
      {
        name: 'registerDecoratedTarget',
        signature: 'registerDecoratedTarget(target: object): Promise<void>',
        description: 'Scan a provider for scheduler decorators and register each task.',
      },
      {
        name: 'scheduleCron',
        signature: 'scheduleCron(name: string, handler: SchedulerHandler, options: CronOptions): Promise<ScheduledHandle>',
        description: 'Programmatically register a cron job with dynamic handlers.',
      },
      {
        name: 'cancel',
        signature: 'cancel(id: string): Promise<void>',
        description: 'Cancel any registered job by its identifier.',
      },
    ],
  },
  {
    name: 'SchedulerRegistry',
    description: 'Holds references to all active scheduled jobs for inspection or diagnostics.',
    methods: [
      {
        name: 'getIntervals',
        signature: 'getIntervals(): Map<string, ScheduledHandle>',
        description: 'View registered interval handles.',
      },
      {
        name: 'removeCronJob',
        signature: 'removeCronJob(id: string): boolean',
        description: 'Remove a cron job from the registry and return whether it existed.',
      },
    ],
  },
];
