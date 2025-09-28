import { type MiddlewareHandler } from '@nl-framework/http';
import { BetterAuthService, createBetterAuthMiddleware } from '@nl-framework/auth';
import { NaelFactory } from '@nl-framework/platform';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { AppModule } from './app.module';
import type { AuthExampleConfig } from './types';

const bootstrap = async () => {
  const app = await NaelFactory.create(AppModule, {
    graphql: false,
  });

  const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
  const appLogger = loggerFactory.create({ context: 'AuthHttpExample' });
  const requestLog = appLogger.child('Request');

  const httpApp = app.getHttpApplication();
  if (!httpApp) {
    appLogger.fatal('HTTP application was not created by NaelFactory');
    throw new Error('HTTP application is not available. Ensure HTTP is enabled in NaelFactory options.');
  }

  const requestLogger: MiddlewareHandler = async (ctx, next) => {
    const started = Date.now();
    try {
      const response = await next();
      requestLog.debug('Handled request', {
        method: ctx.request.method,
        path: new URL(ctx.request.url).pathname,
        status: response.status,
        elapsedMs: Date.now() - started,
      });
      return response;
    } catch (error) {
      requestLog.error('Request failed', error instanceof Error ? error : undefined, {
        method: ctx.request.method,
        path: new URL(ctx.request.url).pathname,
        elapsedMs: Date.now() - started,
      });
      throw error;
    }
  };

  httpApp.use(requestLogger);

  const authService = await app.get(BetterAuthService);
  const requireAuth = createBetterAuthMiddleware(authService);
  const requireAdmin = createBetterAuthMiddleware(authService, { requiredRoles: ['admin'] });

  httpApp.use(async (ctx, next) => {
    const path = new URL(ctx.request.url).pathname;
    if (path === '/me' || path.startsWith('/me/')) {
      return requireAuth(ctx, next);
    }

    if (path.startsWith('/admin')) {
      return requireAdmin(ctx, next);
    }

    return next();
  });

  const config = app.getConfig<AuthExampleConfig>();
  const host = config.get('server.host', '0.0.0.0');
  const port = config.get('server.port', 4100);

  await app.listen({ http: port });
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  appLogger.info('Server successfully started', {
    url: `http://${displayHost}:${port}`,
  });
  appLogger.info('Available endpoints', {
    register: `http://${displayHost}:${port}/auth/register`,
    login: `http://${displayHost}:${port}/auth/login`,
    profile: `http://${displayHost}:${port}/me`,
    admin: `http://${displayHost}:${port}/admin/insights`,
  });
  appLogger.info('Demo credentials', {
    email: 'admin@example.com',
    password: 'changeme',
  });

  const shutdown = async (signal: string) => {
    appLogger.warn('Received shutdown signal', { signal });
    await app.close();
    appLogger.info('Auth HTTP example stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

bootstrap().catch((error) => {
  const fallbackLogger = new Logger({ context: 'AuthHttpExample' });
  fallbackLogger.fatal('Failed to start the auth example application', error instanceof Error ? error : undefined);
  process.exit(1);
});
