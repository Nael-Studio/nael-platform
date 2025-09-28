import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { NaelFactory } from '@nl-framework/platform';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { getSeedRunnerToken, type SeedRunner } from '@nl-framework/orm';
import type { MiddlewareHandler } from '@nl-framework/http';
import { AppModule } from './app.module';
import type { ExampleConfig } from './types';

const bootstrap = async () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const configDir = resolve(currentDir, '../config');

  const app = await NaelFactory.create(AppModule, {
    config: {
      dir: configDir,
    },
    graphql: false,
  });

  const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
  const appLogger = loggerFactory.create({ context: 'OrmExample' });
  const requestLogger = appLogger.child('Request');

  const httpApp = app.getHttpApplication();
  if (!httpApp) {
    appLogger.fatal('HTTP application was not created. Ensure HTTP is enabled in NaelFactory options.');
    throw new Error('HTTP application is not available.');
  }

  const logMiddleware: MiddlewareHandler = async (ctx, next) => {
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

  httpApp.use(logMiddleware);

  const config = app.getConfig<ExampleConfig>();
  const host = config.get('server.host', '0.0.0.0');
  const port = config.get('server.port', 4010);

  await app.listen({ http: port });

  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  const baseUrl = `http://${displayHost}:${port}`;

  const seedRunner = await app.get<SeedRunner>(getSeedRunnerToken());
  appLogger.info('Seed runner ready', {
    autoRun: true,
    registeredSeeds: seedRunner ? 'default connection seeds loaded' : 'none',
  });

  appLogger.info('Mongo ORM example started', {
    baseUrl,
    listUsers: `${baseUrl}/users`,
    createUser: `${baseUrl}/users`,
    softDeleteUser: `${baseUrl}/users/:id`,
    restoreUser: `${baseUrl}/users/:id/restore`,
    withDeletedQuery: `${baseUrl}/users?withDeleted=true`,
  });

  const shutdown = async (signal: string) => {
    appLogger.warn('Received shutdown signal', { signal });
    await app.close();
    appLogger.info('Mongo ORM example stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

bootstrap().catch((error) => {
  const fallbackLogger = new Logger({ context: 'OrmExample' });
  fallbackLogger.fatal('Failed to start Mongo ORM example', error instanceof Error ? error : undefined);
  process.exit(1);
});
