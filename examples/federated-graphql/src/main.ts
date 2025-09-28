import { Logger, LoggerFactory } from '@nl-framework/logger';
import { NaelFactory } from '@nl-framework/platform';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const app = await NaelFactory.create(AppModule, {
    http: false,
    graphql: {
      federation: { enabled: true },
    },
  });

  const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
  const appLogger = loggerFactory.create({ context: 'FederatedGraphqlExample' });

  const { graphql } = await app.listen({ graphql: 4011 });
  const url = graphql?.url ?? 'unknown';
  appLogger.info('Federated GraphQL subgraph ready', { url });

  const shutdown = async (signal: string) => {
    appLogger.warn('Received shutdown signal', { signal });
    await app.close();
    appLogger.info('Federated GraphQL example stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

bootstrap().catch((error) => {
  const fallback = new Logger({ context: 'FederatedGraphqlExample' });
  fallback.fatal('Failed to start the federated example', error instanceof Error ? error : undefined);
  process.exit(1);
});
