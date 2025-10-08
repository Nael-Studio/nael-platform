import type { ApiDecoratorEntry } from '../../types';

export const decoratorReference: ApiDecoratorEntry[] = [
  {
    name: '@Module',
    signature: '@Module(metadata: ModuleMetadata): ClassDecorator',
    description: 'Define an application module with providers, controllers, and imports.',
    parameters: [
      {
        name: 'providers',
        type: 'Provider[]',
        description: 'Services available within the module scope.',
      },
      {
        name: 'controllers',
        type: 'ClassType[]',
        description: 'HTTP controllers exposed by the module.',
      },
    ],
  },
  {
    name: '@Controller',
    signature: '@Controller(prefix?: string): ClassDecorator',
    description: 'Expose a class as an HTTP controller.',
  },
  {
    name: '@Resolver',
    signature: '@Resolver(type?: string | (() => unknown)): ClassDecorator',
    description: 'Mark a class as a GraphQL resolver.',
  },
  {
    name: '@MessagePattern',
    signature: '@MessagePattern(topic: string): MethodDecorator',
    description: 'Subscribe a method to a Dapr pub/sub topic.',
  },
  {
    name: '@Cron',
    signature: '@Cron(expression: string, options?: CronDecoratorOptions): MethodDecorator',
    description: 'Run a method on a cron expression evaluated within a Bun worker.',
    parameters: [
      {
        name: 'expression',
        type: 'string',
        description: 'Standard cron expression (supports seconds) parsed via cron-parser.',
        required: true,
      },
      {
        name: 'options',
        type: 'CronDecoratorOptions',
        description: 'Optional task name, timezone, max run count, and run-on-init flag.',
      },
    ],
  },
  {
    name: '@Interval',
    signature: '@Interval(milliseconds: number, options?: IntervalDecoratorOptions): MethodDecorator',
    description: 'Invoke a handler on a fixed cadence, optionally stopping after a set number of executions.',
  },
  {
    name: '@Timeout',
    signature: '@Timeout(milliseconds: number, options?: TimeoutDecoratorOptions): MethodDecorator',
    description: 'Delay a single execution by the provided milliseconds value.',
  },
];
