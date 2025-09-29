import { NaelFactory } from '@nl-framework/platform';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { registerHttpGuards, type MiddlewareHandler } from '@nl-framework/http';
import { createBetterAuthMiddleware, BetterAuthService, AuthGuard } from '@nl-framework/auth';
import { AppModule } from './app.module';
import type { ExampleConfig } from './types';

const bootstrap = async () => {
  const app = await NaelFactory.create(AppModule, {
    http: true,
    graphql: {
      enabled: true,
    },
  });

  const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
  const appLogger = loggerFactory.create({ context: 'AuthGraphqlExample' });
  const requestLogger = appLogger.child('Request');

  const httpApp = app.getHttpApplication();
  const graphqlApp = app.getGraphqlApplication();

  if (!httpApp) {
    appLogger.fatal('HTTP application is not available. Ensure NaelFactory HTTP mode is enabled.');
    throw new Error('HTTP application was not created.');
  }

  if (!graphqlApp) {
    appLogger.fatal('GraphQL application is not available. Ensure NaelFactory GraphQL mode is enabled.');
    throw new Error('GraphQL application was not created.');
  }

  registerHttpGuards(AuthGuard);
  const authService = await httpApp.get(BetterAuthService);

  const requestLogMiddleware: MiddlewareHandler = async (ctx, next) => {
    const started = Date.now();
    try {
      const response = await next();
      const elapsed = Date.now() - started;
      requestLogger.debug('Handled request', {
        method: ctx.request.method,
        path: new URL(ctx.request.url).pathname,
        status: response.status,
        elapsedMs: elapsed,
      });
      return response;
    } catch (error) {
      const elapsed = Date.now() - started;
      requestLogger.error('Request failed', error instanceof Error ? error : undefined, {
        method: ctx.request.method,
        path: new URL(ctx.request.url).pathname,
        elapsedMs: elapsed,
      });
      throw error;
    }
  };

  httpApp.use(requestLogMiddleware);
  httpApp.use(createBetterAuthMiddleware(authService));

  const config = app.getConfig<ExampleConfig>();
  const host = config.get('server.host', '127.0.0.1') as string;
  const httpPort = config.get('server.httpPort', 4201) as number;
  const graphqlPort = config.get('server.graphqlPort', 4202) as number;

  await app.listen({ http: httpPort, graphql: graphqlPort });
  const displayHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  appLogger.info('Auth GraphQL example ready', {
    httpUrl: `http://${displayHost}:${httpPort}`,
    graphqlUrl: `http://${displayHost}:${graphqlPort}/graphql`,
    authEndpoints: `http://${displayHost}:${httpPort}/api/auth/*`,
  });

  const shutdown = async (signal: string) => {
    appLogger.warn('Received shutdown signal', { signal });
    await app.close();
    appLogger.info('Auth GraphQL example stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

bootstrap().catch((error) => {
  const fallbackLogger = new Logger({ context: 'AuthGraphqlExample' });
  fallbackLogger.fatal('Failed to start the auth GraphQL example', error instanceof Error ? error : undefined);
  process.exit(1);
});
