import type { PackageDocumentation } from '../../types';

export const platformDocumentation: PackageDocumentation = {
  name: '@nl-framework/platform',
  version: '0.1.0',
  description:
    'Platform adapters and bootstrap utilities that host NL Framework Framework modules for HTTP, GraphQL, and microservice workloads.',
  installation: 'bun add @nl-framework/platform',
  features: [
    {
      title: 'Unified Bootstrap',
      description: 'Start HTTP servers, GraphQL gateways, and microservices with consistent APIs.',
      icon: '🚀',
    },
    {
      title: 'Testing Harness',
      description: 'Spin up lightweight application instances for integration testing.',
      icon: '🧪',
    },
    {
      title: 'Adapter Interfaces',
      description: 'Implement custom adapters (Fastify, Express) without changing controller logic.',
      icon: '🔌',
    },
  ],
  quickStart: {
    description: 'Bootstrap an HTTP application using the platform convenience wrapper.',
    steps: [
      'Create a root module that registers controllers or resolvers.',
      'Invoke `bootstrapHttpApplication` and pass runtime options.',
      'Use the returned app handle to register global middleware or close gracefully.',
    ],
    code: `import { bootstrapHttpApplication } from '@nl-framework/platform';
import { AppModule } from './app.module';

const app = await bootstrapHttpApplication(AppModule, {
  port: 3000,
  logger: true,
});

await app.start();
console.log('HTTP server ready');
`,
  },
  api: {
    classes: [
      {
        name: 'BootstrapResult',
        description: 'Return type from bootstrap helpers exposing the application context and shutdown hooks.',
        methods: [
          {
            name: 'start',
            signature: 'start(): Promise<void>',
            description: 'Begin listening for requests/messages.',
          },
          {
            name: 'stop',
            signature: 'stop(): Promise<void>',
            description: 'Gracefully dispose the server and container.',
          },
        ],
      },
    ],
  },
  examples: [
    {
      title: 'Hybrid HTTP & Microservice',
      description: 'Run both HTTP and Dapr adapters from a single module.',
      code: `const httpApp = await bootstrapHttpApplication(AppModule);
const microApp = await bootstrapMicroserviceApplication(AppModule);

await Promise.all([httpApp.start(), microApp.start()]);
`,
    },
    {
      title: 'HTTP + GraphQL via NLFactory',
      description: 'Start the platform wrapper with GraphQL auto-discovery and log the server URL.',
      code: `import { NLFactory } from '@nl-framework/platform';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { AppModule } from './modules/app.module';

const bootstrap = async () => {
  const app = await NLFactory.create(AppModule, {
    graphql: {
      path: '/api/graphql',
    },
  });

  const loggerFactory = await app.get(LoggerFactory);
  const appLogger = loggerFactory.create({ context: 'BasicGraphqlExample' });

  const { graphql } = await app.listen();
  const url = graphql?.url ?? 'unknown';
  appLogger.info('GraphQL server is running', { url });

  const shutdown = async (signal: string) => {
    appLogger.warn('Received shutdown signal', { signal });
    await app.close();
    appLogger.info('GraphQL example stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

bootstrap().catch((error) => {
  const fallback = new Logger({ context: 'BasicGraphqlExample' });
  fallback.fatal(
    'Failed to start the GraphQL example',
    error instanceof Error ? error : undefined,
  );
  process.exit(1);
});
`,
    },
  ],
  bestPractices: [
    {
      category: 'Operations',
      do: [
        {
          title: 'Add health checks',
          description: 'Leverage the platform testing harness to build health endpoints and readiness probes.',
        },
      ],
      dont: [
        {
          title: 'Skip graceful shutdown',
          description: 'Always call `stop()` on process signals to flush logs and release connections.',
        },
      ],
    },
  ],
  troubleshooting: [
    {
      issue: 'Port already in use',
      symptoms: ['Bootstrap throws EADDRINUSE'],
      solution: 'Confirm no other service is running on the target port or configure a new one via options.',
    },
  ],
  relatedPackages: [
    '@nl-framework/core',
    '@nl-framework/http',
    '@nl-framework/graphql',
    '@nl-framework/microservices',
  ],
};
