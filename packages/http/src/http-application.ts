import 'reflect-metadata';
import type { ClassType, ApplicationOptions, Token, ApplicationContext } from '@nl-framework/core';
import {
  Application,
  getControllerPrefix,
  RequestContext as AmbientRequestContext,
  createRequestContextData,
} from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { Router } from './router/router';
import type { MiddlewareHandler, HttpMethod, RequestContext } from './interfaces/http';
import type { HttpVersioningOptions } from './versioning/options';
import { getRouteDefinitions } from './decorators/routes';
import { listHttpRouteRegistrars } from './registry';
import { PUBLIC_ROUTE_METADATA_KEY } from './constants';
import {
  type CorsOptions,
  normalizeCorsOptions,
  isPreflight,
  buildPreflightResponse,
  applyCorsHeaders,
} from './middleware/cors';
import {
  type SecurityOptions,
  normalizeSecurityOptions,
  applySecurityHeaders,
} from './middleware/security';
import { type ServeStaticOptions, createStaticFileServer } from './static/serve-static';

export interface HttpServerOptions {
  host?: string;
  port?: number;
  middleware?: MiddlewareHandler[];
  versioning?: HttpVersioningOptions;
  /** Enable CORS (`true` = allow any origin) or configure it. */
  cors?: boolean | CorsOptions;
  /** Enable security response headers (`true` = helmet-core defaults) or configure them. */
  security?: boolean | SecurityOptions;
  /** Serve static files from one or more mounts before routing. */
  serveStatic?: ServeStaticOptions | ServeStaticOptions[];
}

export interface HttpApplicationOptions extends ApplicationOptions, HttpServerOptions { }

const createDynamicRouteController = (
  className: string,
  handlerName: string,
  handler: (context: RequestContext) => unknown | Promise<unknown>,
): ClassType => {
  const controllerMap = {
    [className]: class {
      [handlerName](context: RequestContext) {
        return handler(context);
      }
    },
  };

  return controllerMap[className] as ClassType;
};

export class HttpApplication {
  private readonly router: Router;
  private server?: ReturnType<typeof Bun.serve>;
  private logger: Logger;
  private customRouteCounter = 0;
  private readonly routeRegistrarPromise: Promise<void>;
  private readonly unsubscribeModuleListener: () => void;
  private readonly corsOptions?: CorsOptions;
  private readonly securityOptions?: SecurityOptions;
  private readonly staticServers: Array<(request: Request) => Promise<Response | null>>;

  constructor(
    private readonly context: ApplicationContext,
    private readonly options: HttpServerOptions,
    private readonly ownsContext: boolean,
  ) {
    this.corsOptions = normalizeCorsOptions(options.cors ?? false);
    this.securityOptions = normalizeSecurityOptions(options.security ?? false);
    const staticMounts = options.serveStatic
      ? Array.isArray(options.serveStatic)
        ? options.serveStatic
        : [options.serveStatic]
      : [];
    this.staticServers = staticMounts.map((mount) => createStaticFileServer(mount));
    const baseLogger = this.context.getLogger().child('HttpApplication');
    this.logger = baseLogger;
    this.router = new Router({ versioning: options.versioning, logger: this.logger });

    void this.context
      .get<LoggerFactory>(LoggerFactory)
      .then((loggerFactory) => {
        this.logger = loggerFactory.create({ context: 'HttpApplication' });
        this.router.setLogger(this.logger);
      })
      .catch(() => {
        this.logger = baseLogger;
      });
    this.registerControllers();
    this.unsubscribeModuleListener = this.context.addModuleLoadListener(async ({ controllers }) => {
      this.registerControllerInstances(controllers);
    });
    this.routeRegistrarPromise = this.initializeRouteRegistrars();
    for (const middleware of options.middleware ?? []) {
      this.router.use(middleware);
    }

    const controllerCount = this.context.getControllers().length;
    const middlewareCount = options.middleware?.length ?? 0;
    this.logger.info(
      `HTTP module loaded (controllers=${controllerCount}, middleware=${middlewareCount})`,
    );
  }

  private registerControllers(): void {
    this.registerControllerInstances(this.context.getControllers<object>());
  }

  private registerControllerInstances(instances: unknown[]): void {
    for (const controller of instances) {
      this.registerControllerInstance(controller);
    }
  }

  private registerControllerInstance(controller: unknown): void {
    if (!controller || typeof controller !== 'object') {
      return;
    }

    const controllerClass = controller.constructor as ClassType;
    const routes = getRouteDefinitions(controllerClass);
    if (!routes.length) {
      this.logger.warn('Controller has no routable handlers', {
        controller: controllerClass.name,
      });
      return;
    }

    this.logger.info('Registering HTTP routes', {
      controller: controllerClass.name,
      routes: routes.map((route) => ({ method: route.method, path: route.path })),
    });

    this.router.registerController(
      {
        prefix: getControllerPrefix(controllerClass),
        controller: controllerClass,
        routes,
      },
      controller,
    );
  }

  use(middleware: MiddlewareHandler): void {
    this.router.use(middleware);
  }

  registerRouteHandler(
    method: HttpMethod,
    path: string,
    handler: (context: RequestContext) => unknown | Promise<unknown>,
    options: { public?: boolean } = {},
  ): void {
    const handlerName = `__custom_route_${++this.customRouteCounter}`;
    const routeDefinition = {
      method,
      path,
      handlerName,
    } as const;

    const className = `CustomRouteController_${this.customRouteCounter}`;
    const DynamicController = createDynamicRouteController(className, handlerName, handler);

    if (options.public) {
      Reflect.defineMetadata(PUBLIC_ROUTE_METADATA_KEY, true, DynamicController.prototype, handlerName);
      Reflect.defineMetadata(PUBLIC_ROUTE_METADATA_KEY, true, DynamicController, handlerName);
    }

    const controllerInstance = new DynamicController();

    this.router.registerController(
      {
        prefix: '',
        controller: DynamicController as unknown as ClassType,
        routes: [routeDefinition],
      },
      controllerInstance,
    );

    this.logger.debug('Registered custom HTTP route handler', { method, path });
  }

  /**
   * Dispatch a single `Request` through the full routing pipeline and return the
   * resulting `Response`, without binding a port. This is what `Bun.serve`'s
   * `fetch` handler calls, and it lets tests (and serverless adapters) drive the
   * application directly. Route registrars are awaited on first use.
   */
  async handle(request: Request): Promise<Response> {
    await this.routeRegistrarPromise;

    // Short-circuit CORS preflight before any routing/DI work.
    if (this.corsOptions && isPreflight(request)) {
      const preflight = buildPreflightResponse(this.corsOptions, request);
      if (preflight) {
        return this.finalizeResponse(request, preflight);
      }
    }

    // Static file mounts are checked before routing.
    for (const serve of this.staticServers) {
      const staticResponse = await serve(request);
      if (staticResponse) {
        return this.finalizeResponse(request, staticResponse);
      }
    }

    const contextId = this.context.createContextId('http');
    const url = new URL(request.url);
    const requestContext = createRequestContextData({
      kind: 'http',
      name: `${request.method} ${url.pathname}`,
      requestId: request.headers.get('x-request-id') ?? undefined,
    });
    try {
      const response = await AmbientRequestContext.run(requestContext, () =>
        this.router.handle(request, {
          resolve: <T>(token: Token<T>) => this.context.get(token, { contextId }),
        }),
      );
      // Echo the correlation id so clients (and downstream services) can trace it.
      try {
        response.headers.set('x-request-id', requestContext.requestId);
      } catch {
        // Some responses (e.g. redirects) carry immutable headers — echo is best effort.
      }
      return this.finalizeResponse(request, response);
    } finally {
      this.context.releaseContext(contextId);
    }
  }

  /** Apply CORS + security response headers to an outgoing response. */
  private finalizeResponse(request: Request, response: Response): Response {
    let result = response;
    if (this.corsOptions) {
      result = applyCorsHeaders(this.corsOptions, request, result);
    }
    if (this.securityOptions) {
      result = applySecurityHeaders(this.securityOptions, result);
    }
    return result;
  }

  async listen(port?: number): Promise<ReturnType<typeof Bun.serve>> {
    await this.routeRegistrarPromise;
    const listenPort = port ?? this.options.port ?? 3000;
    const hostname = this.options.host ?? '0.0.0.0';

    this.server = Bun.serve({
      port: listenPort,
      hostname,
      fetch: (request) => this.handle(request),
    });

    const actualHost = this.server.hostname ?? hostname;
    const accessibleHost = actualHost === '0.0.0.0' ? 'localhost' : actualHost;
    const boundPort = this.server.port ?? listenPort;
    const url = `http://${accessibleHost}:${boundPort}`;

    this.logger.info(`NL Framework HTTP started at ${url}`);

    return this.server;
  }

  async get<T>(token: Token<T>): Promise<T> {
    return this.context.get(token);
  }

  getConfig<TConfig extends Record<string, unknown>>() {
    return this.context.getConfig<TConfig>();
  }

  async close(): Promise<void> {
    this.server?.stop();
    this.logger.info('HTTP server stopped');
    this.unsubscribeModuleListener?.();
    if (this.ownsContext) {
      await this.context.close();
    }
  }

  private async initializeRouteRegistrars(): Promise<void> {
    const registrars = listHttpRouteRegistrars();
    if (!registrars.length) {
      return;
    }

    for (const registrar of registrars) {
      try {
        await registrar({
          logger: this.logger,
          registerRoute: (method, path, handler) =>
            this.registerRouteHandler(method, path, handler),
          resolve: <T>(token: Token<T>) => this.context.get(token),
        });
      } catch (error) {
        const message =
          error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        this.logger.error('Failed to execute HTTP route registrar', { error: message });
      }
    }

    this.logger.info('HTTP route registrars executed', { count: registrars.length });
  }
}

export const createHttpApplication = async (
  rootModule: ClassType,
  options: HttpApplicationOptions = {},
): Promise<HttpApplication> => {
  const app = new Application();
  const { config, logger, ...serverOptions } = options;
  const context = await app.bootstrap(rootModule, { config, logger });
  return new HttpApplication(context, serverOptions, true);
};

export const createHttpApplicationFromContext = (
  context: ApplicationContext,
  options: HttpServerOptions = {},
): HttpApplication => new HttpApplication(context, options, false);
