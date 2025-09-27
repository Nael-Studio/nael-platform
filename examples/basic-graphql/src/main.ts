import { NaelFactory } from '@nl-framework/platform';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const app = await NaelFactory.create(AppModule, {
    http: false,
    graphql: {
      federation: { enabled: false },
    },
  });

  const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
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
  fallback.fatal('Failed to start the GraphQL example', error instanceof Error ? error : undefined);
  process.exit(1);
});
