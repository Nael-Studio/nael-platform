import { NL FrameworkFactory } from '@nl-framework/platform';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import type { MiddlewareHandler } from '@nl-framework/http';
import {
  createBetterAuthMultiTenantMiddleware,
  BetterAuthMultiTenantService,
  MultiTenantAuthGuard,
  registerBetterAuthMultiTenantHttpRoutes,
  BETTER_AUTH_HTTP_OPTIONS,
  registerMultiTenantAuthGuard,
} from '@nl-framework/auth';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const app = await NL FrameworkFactory.create(AppModule);

  const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
  const appLogger = loggerFactory.create({ context: 'AuthMultiTenantGraphqlExample' });
  const requestLogger = appLogger.child('Request');

  const httpApp = app.getHttpApplication();
  const graphqlApp = app.getGraphqlApplication();

  if (!httpApp) {
    appLogger.fatal('HTTP application is not available. HTTP is always enabled, so this indicates an internal error.');
    throw new Error('HTTP application was not created.');
  }

  if (!graphqlApp) {
    appLogger.fatal('GraphQL application is not available. Ensure at least one resolver is registered.');
    throw new Error('GraphQL application was not created.');
  }

  registerMultiTenantAuthGuard();
  const authService = await httpApp.get(BetterAuthMultiTenantService);
  const httpOptions = await httpApp.get(BETTER_AUTH_HTTP_OPTIONS);

  registerBetterAuthMultiTenantHttpRoutes(authService, httpOptions, { tenantKey: 'default' });

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
  httpApp.use(
    createBetterAuthMultiTenantMiddleware(authService, {
      requireSession: false,
      attach: true,
    }),
  );

  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? 4301);

  const results = await app.listen({ http: port });
  const displayHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  const httpUrl = `http://${displayHost}:${port}`;
  const graphqlUrl = results.graphql?.url ?? `${httpUrl}/graphql`;
  appLogger.info('Auth multi-tenant GraphQL example ready', {
    httpUrl,
    graphqlUrl,
    authEndpoints: `${httpUrl}${httpOptions.prefix}/*`,
    tenantHeader: 'x-tenant-id',
  });

  const shutdown = async (signal: string) => {
    appLogger.warn('Received shutdown signal', { signal });
    await app.close();
    appLogger.info('Auth multi-tenant GraphQL example stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

bootstrap().catch((error) => {
  const fallbackLogger = new Logger({ context: 'AuthMultiTenantGraphqlExample' });
  fallbackLogger.fatal('Failed to start the auth multi-tenant GraphQL example', error instanceof Error ? error : undefined);
  process.exit(1);
});
