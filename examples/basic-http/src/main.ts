import { type MiddlewareHandler } from '@nl-framework/http';
import { NaelFactory } from '@nl-framework/platform';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { AppModule } from './app.module';
import type { ExampleConfig } from './types';

const bootstrap = async () => {
  const app = await NaelFactory.create(AppModule);

  const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
  const appLogger = loggerFactory.create({ context: 'BasicHttpExample' });
  const requestLog = appLogger.child('Request');

  const httpApp = app.getHttpApplication();
  if (!httpApp) {
    appLogger.fatal('HTTP application was not created by NaelFactory');
    throw new Error('HTTP application is not available. HTTP is always enabled, so this indicates an internal error.');
  }

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

  httpApp.use(requestLogger);

  const config = app.getConfig<ExampleConfig>();
  const host = config.get('server.host', '0.0.0.0');
  const port = config.get('server.port', 3000);

  await app.listen({ http: port });
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  appLogger.info('Server successfully started', {
    url: `http://${displayHost}:${port}`,
  });
  appLogger.info('Available endpoints', {
    root: `http://${displayHost}:${port}/`,
    hello: `http://${displayHost}:${port}/hello`,
    personalGreeting: `http://${displayHost}:${port}/hello/:name`,
  });

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
