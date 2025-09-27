import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHttpApplication, type MiddlewareHandler } from '@nl-framework/http';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { AppModule } from './app.module';
import type { ExampleConfig } from './types';

const bootstrap = async () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const configDir = resolve(currentDir, '../config');
  const app = await createHttpApplication(AppModule, {
    config: {
      dir: configDir,
    },
  });

  const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
  const appLogger = loggerFactory.create({ context: 'BasicHttpExample' });
  const requestLog = appLogger.child('Request');

  const requestLogger: MiddlewareHandler = async (ctx, next) => {
    const started = Date.now();
    try {
      const response = await next();
      const elapsed = Date.now() - started;
      requestLog.debug('Handled request', {
        method: ctx.request.method,
        path: new URL(ctx.request.url).pathname,
        status: response.status,
        elapsedMs: elapsed,
      });
      return response;
    } catch (error) {
      const elapsed = Date.now() - started;
      requestLog.error('Request failed', error instanceof Error ? error : undefined, {
        method: ctx.request.method,
        path: new URL(ctx.request.url).pathname,
        elapsedMs: elapsed,
      });
      throw error;
    }
  };

  app.use(requestLogger);

  const config = app.getConfig<ExampleConfig>();
  const host = config.get('server.host', '0.0.0.0');
  const port = config.get('server.port', 3000);

  await app.listen(port);
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  appLogger.info(`Server successfully started`);

  const shutdown = async (signal: string) => {
    appLogger.warn('Received shutdown signal', { signal });
    await app.close();
    appLogger.info('HTTP example stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

bootstrap().catch((error) => {
  const fallbackLogger = new Logger({ context: 'BasicHttpExample' });
  fallbackLogger.fatal('Failed to start the example application', error instanceof Error ? error : undefined);
  process.exit(1);
});
