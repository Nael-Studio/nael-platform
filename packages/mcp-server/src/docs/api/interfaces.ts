import type { ApiInterfaceEntry } from '../../types';

export const interfaceReference: ApiInterfaceEntry[] = [
  {
    name: 'RequestContext',
    description: 'HTTP request metadata injected into controller methods.',
    properties: [
      {
        name: 'request',
        type: 'Request',
        description: 'Native Request object for the incoming call.',
        required: true,
      },
      {
        name: 'params',
        type: 'Record<string, string>',
        description: 'Route parameters extracted from the URL.',
        required: true,
      },
      {
        name: 'query',
        type: 'URLSearchParams',
        description: 'Querystring parameters.',
        required: true,
      },
    ],
  },
  {
    name: 'BootstrapOptions',
    description: 'Configuration for platform bootstrap helpers.',
    properties: [
      {
        name: 'port',
        type: 'number',
        description: 'Listening port for HTTP applications.',
        required: false,
      },
      {
        name: 'logger',
        type: 'boolean | Logger',
        description: 'Enable or provide a logger instance.',
        required: false,
      },
    ],
  },
  {
    name: 'CronOptions',
    description: 'Options accepted by `SchedulerService.scheduleCron` and the `@Cron` decorator.',
    properties: [
      { name: 'cron', type: 'string', description: 'Cron expression describing the schedule.', required: true },
      { name: 'name', type: 'string', description: 'Optional logical identifier for the task.', required: false },
      { name: 'timezone', type: 'string', description: 'IANA timezone for evaluating the cron expression.', required: false },
      { name: 'runOnInit', type: 'boolean', description: 'Execute once immediately after registration.', required: false },
      { name: 'maxRuns', type: 'number', description: 'Automatic cancellation threshold based on executions.', required: false },
    ],
  },
  {
    name: 'IntervalOptions',
    description: 'Interval-specific scheduling options.',
    properties: [
      { name: 'interval', type: 'number', description: 'Delay between executions in milliseconds.', required: true },
      { name: 'name', type: 'string', description: 'Optional identifier for registry lookups.', required: false },
      { name: 'runOnInit', type: 'boolean', description: 'Trigger the callback immediately after scheduling.', required: false },
      { name: 'maxRuns', type: 'number', description: 'Maximum number of executions before cancellation.', required: false },
    ],
  },
  {
    name: 'TimeoutOptions',
    description: 'Timeout scheduling options for delayed one-off executions.',
    properties: [
      { name: 'timeout', type: 'number', description: 'Delay before execution in milliseconds.', required: true },
      { name: 'name', type: 'string', description: 'Identifier used for cancellation or introspection.', required: false },
      { name: 'runOnInit', type: 'boolean', description: 'Execute immediately as well as after the delay.', required: false },
    ],
  },
];
