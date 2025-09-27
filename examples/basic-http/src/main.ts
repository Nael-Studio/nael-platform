import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHttpApplication, type MiddlewareHandler } from '@nl-framework/http';
import { AppModule } from './app.module';
import type { ExampleConfig } from './types';

const bootstrap = async () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const configDir = resolve(currentDir, '../config');

  const requestLogger: MiddlewareHandler = async (ctx, next) => {
    const started = Date.now();
    const response = await next();
    const elapsed = Date.now() - started;
    console.log(`${ctx.request.method} ${new URL(ctx.request.url).pathname} -> ${elapsed}ms`);
    return response;
  };

  const app = await createHttpApplication(AppModule, {
    config: {
      dir: configDir,
    },
    middleware: [requestLogger],
  });

  const config = app.getConfig<ExampleConfig>();
  const host = config.get('server.host', '0.0.0.0');
  const port = config.get('server.port', 3000);

  await app.listen(port);
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  console.log(`🚀 Basic HTTP example listening on http://${displayHost}:${port}/hello`);

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

bootstrap().catch((error) => {
  console.error('Failed to start the example application:', error);
  process.exit(1);
});
