import type { PackageDocumentation } from '../../types';

export const loggerDocumentation: PackageDocumentation = {
  name: '@nl-framework/logger',
  version: '0.1.0',
  description:
    'Structured logging system with JSON output, contextual metadata, and Bun/Node transport adapters tailored for the Nael Framework.',
  installation: 'bun add @nl-framework/logger',
  features: [
    {
      title: 'Contextual Logging',
      description: 'Attach correlation IDs and request metadata transparently throughout the call stack.',
      icon: '🧾',
    },
    {
      title: 'Multiple Transports',
      description: 'Stream logs to stdout, files, or remote systems with pluggable transports.',
      icon: '🚚',
    },
    {
      title: 'DI Integration',
      description: 'Inject the logger into providers to capture structured logs with contextual metadata.',
      icon: '🔌',
    },
  ],
  quickStart: {
    description: 'Create a logger instance, attach it to the application, and log from a service.',
    steps: [
      'Instantiate `Logger` with optional default metadata.',
      'Pass it into `Application.create` or the platform bootstrap helpers.',
      'Use `logger.child` to create per-request loggers.',
    ],
    code: `import { Logger } from '@nl-framework/logger';
import { Application } from '@nl-framework/core';

const logger = new Logger({ service: 'users-api' });
const app = await Application.create(AppModule, { logger });

logger.info('Application booted');
`,
  },
  api: {
    classes: [
      {
        name: 'Logger',
        description: 'Main logging facade with level methods (`debug`, `info`, `warn`, `error`).',
        methods: [
          {
            name: 'child',
            signature: 'child(metadata: Record<string, unknown>): Logger',
            description: 'Create a new logger instance that inherits metadata for nested scopes.',
          },
        ],
      },
    ],
  },
  examples: [
    {
      title: 'Request Scoped Logger',
      description: 'Create per-request loggers via middleware.',
      code: `app.use(async (ctx, next) => {
  const requestLogger = logger.child({ requestId: crypto.randomUUID() });
  ctx.set('logger', requestLogger);
  requestLogger.info('Incoming request', { path: ctx.path });
  await next();
});
`,
    },
  ],
  bestPractices: [
    {
      category: 'Observability',
      do: [
        {
          title: 'Use structured JSON',
          description: 'Stick to JSON logs for easier aggregation in ELK, Loki, or OpenSearch backends.',
        },
      ],
      dont: [
        {
          title: 'Avoid console.log in services',
          description: 'Always use the shared logger to preserve metadata.',
        },
      ],
    },
  ],
  troubleshooting: [
    {
      issue: 'Missing logs',
      symptoms: ['Nothing printed to console'],
      solution: 'Ensure the logger level is set appropriately and that transports are configured in production environments.',
    },
  ],
  relatedPackages: ['@nl-framework/core', '@nl-framework/http', '@nl-framework/microservices'],
};
