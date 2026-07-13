import { createGraphqlApplication } from '@nl-framework/graphql';
import { Logger } from '@nl-framework/logger';
import { AppModule } from './app.module';
import { pubsub } from './pubsub';

const logger = new Logger({ context: 'GraphqlSubscriptionsExample' });

/**
 * Boot a standalone GraphQL server with `graphql-ws` subscriptions on the same
 * port as the HTTP endpoint. Query/mutate over HTTP POST `/graphql`; subscribe
 * over `ws://.../graphql`.
 */
export const bootstrap = async (port = 4030) => {
  const app = await createGraphqlApplication(AppModule, {
    path: '/graphql',
    pubsub,
    subscriptions: true,
  });
  const { url } = await app.listen(port);
  logger.info('GraphQL + subscriptions server running', { url });
  return app;
};

if (import.meta.main) {
  const app = await bootstrap();
  const shutdown = async (signal: string) => {
    logger.warn('Shutting down', { signal });
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
