import { NaelFactory } from '@nl-framework/platform';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import type { MiddlewareHandler, HttpMethod, RequestContext } from '@nl-framework/http';
import { createBetterAuthMiddleware, BetterAuthService } from '@nl-framework/auth';
import { AppModule } from './app.module';
import type { ExampleConfig } from './types';

const bootstrap = async () => {
  const app = await NaelFactory.create(AppModule, {
    graphql: false,
  });

  const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
  const appLogger = loggerFactory.create({ context: 'AuthHttpExample' });
  const requestLogger = appLogger.child('Request');

  const httpApp = app.getHttpApplication();
  if (!httpApp) {
    appLogger.fatal('HTTP application is not available. Ensure NaelFactory HTTP mode is enabled.');
    throw new Error('HTTP application was not created.');
  }

  const authService = await httpApp.get(BetterAuthService);
  const betterAuth = authService.instance;

  const reconstructRequest = (ctx: RequestContext): Request => {
    const original = ctx.request;
    const method = original.method.toUpperCase();

    if (method === 'GET' || method === 'HEAD') {
      return original;
    }

    let body: BodyInit | undefined;

    if (ctx.body instanceof ArrayBuffer) {
      body = ctx.body;
    } else if (typeof ctx.body === 'string') {
      body = ctx.body;
    } else if (ctx.body !== null && ctx.body !== undefined) {
      body = JSON.stringify(ctx.body);
    }

    const headers = new Headers(original.headers);
    if (body && typeof body === 'string' && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    return new Request(original.url, {
      method,
      headers,
      body,
    });
  };

  const registerBetterAuthRoutes = () => {
    const registered = new Set<string>();
    const supportedMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

    const apiEntries = Object.values(betterAuth.api ?? {}) as Array<{
      path?: string;
      options?: { method?: string | string[] };
    }>;

    for (const entry of apiEntries) {
      if (!entry?.path) {
        continue;
      }

      const rawMethods = entry.options?.method;
      const methods = Array.isArray(rawMethods)
        ? rawMethods
        : rawMethods
          ? [rawMethods]
          : ['GET'];

      for (const method of methods) {
        const normalizedMethod = method.toUpperCase() as HttpMethod;
        if (!supportedMethods.includes(normalizedMethod)) {
          continue;
        }

        const fullPath = `/api/auth${entry.path}`;
        const dedupeKey = `${normalizedMethod} ${fullPath}`;
        if (registered.has(dedupeKey)) {
          continue;
        }
        registered.add(dedupeKey);

        httpApp.registerRouteHandler(normalizedMethod, fullPath, async (ctx) => {
          const request = reconstructRequest(ctx);
          return authService.handle(request);
        });
      }

      if (!methods.includes('OPTIONS')) {
        const optionsPath = `/api/auth${entry.path}`;
        const optionsKey = `OPTIONS ${optionsPath}`;
        if (!registered.has(optionsKey)) {
          registered.add(optionsKey);
          httpApp.registerRouteHandler('OPTIONS', optionsPath, async (ctx) => {
            const origin = ctx.request.headers.get('origin') ?? '*';
            const allowHeaders = ctx.request.headers.get('access-control-request-headers') ?? '*';
            const allowMethod = ctx.request.headers.get('access-control-request-method') ?? 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD';

            const headers = new Headers({
              'Access-Control-Allow-Origin': origin,
              'Access-Control-Allow-Credentials': 'true',
              'Access-Control-Allow-Headers': allowHeaders,
              'Access-Control-Allow-Methods': allowMethod,
              Vary: 'Origin',
            });

            return new Response(null, { status: 204, headers });
          });
        }
      }
    }

    appLogger.info('Better Auth routes registered', { count: registered.size });
  };

  registerBetterAuthRoutes();

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
  const port = config.get('server.port', 4100);

  await app.listen({ http: port });
  const displayHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  appLogger.info('Auth HTTP example ready', {
    url: `http://${displayHost}:${port}`,
    authEndpoints: `http://${displayHost}:${port}/api/auth/*`,
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
  fallbackLogger.fatal('Failed to start the auth example', error instanceof Error ? error : undefined);
  process.exit(1);
});
