import 'reflect-metadata';
import type { ClassType, ApplicationOptions, Token, ApplicationContext } from '@nl-framework/core';
import { Application, getControllerPrefix } from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import type { Server } from 'bun';
import { Router } from './router/router';
import type { MiddlewareHandler, HttpMethod, RequestContext } from './interfaces/http';
import { getRouteDefinitions } from './decorators/routes';
import { listHttpRouteRegistrars } from './registry';
import { PUBLIC_ROUTE_METADATA_KEY } from './constants';

export interface HttpServerOptions {
  host?: string;
  port?: number;
  middleware?: MiddlewareHandler[];
}

export interface HttpApplicationOptions extends ApplicationOptions, HttpServerOptions {}

export class HttpApplication {
  private readonly router = new Router();
  private server?: Server;
  private logger: Logger;
  private customRouteCounter = 0;
  private readonly routeRegistrarPromise: Promise<void>;

  constructor(
    private readonly context: ApplicationContext,
    private readonly options: HttpServerOptions,
    private readonly ownsContext: boolean,
  ) {
    const baseLogger = this.context.getLogger().child('HttpApplication');
    this.logger = baseLogger;
    void this.context
      .get<LoggerFactory>(LoggerFactory)
      .then((loggerFactory) => {
        this.logger = loggerFactory.create({ context: 'HttpApplication' });
      })
      .catch(() => {
        this.logger = baseLogger;
      });
    this.registerControllers();
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
    const controllers = this.context.getControllers<object>();
    for (const controller of controllers) {
      const controllerClass = controller.constructor as ClassType;
      const routes = getRouteDefinitions(controllerClass);
      if (!routes.length) {
        this.logger.warn('Controller has no routable handlers', {
          controller: controllerClass.name,
        });
        continue;
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

    const DynamicController = class {
      [handlerName](context: RequestContext) {
        return handler(context);
      }
    };

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

  async listen(port?: number): Promise<Server> {
    await this.routeRegistrarPromise;
    const listenPort = port ?? this.options.port ?? 3000;
    const hostname = this.options.host ?? '0.0.0.0';

    this.server = Bun.serve({
      port: listenPort,
      hostname,
      fetch: (request) =>
        this.router.handle(request, {
          resolve: <T>(token: Token<T>) => this.context.get(token),
        }),
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
