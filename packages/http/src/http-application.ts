import type { ClassType, ApplicationOptions, Token, ApplicationContext } from '@nl-framework/core';
import { Application, getControllerPrefix } from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import type { Server } from 'bun';
import { Router } from './router/router';
import type { MiddlewareHandler } from './interfaces/http';
import { getRouteDefinitions } from './decorators/routes';

export interface HttpApplicationOptions extends ApplicationOptions {
  host?: string;
  port?: number;
  middleware?: MiddlewareHandler[];
}

export class HttpApplication {
  private readonly router = new Router();
  private server?: Server;
  private logger: Logger;

  constructor(
    private readonly app: Application,
    private readonly context: ApplicationContext,
    private readonly options: HttpApplicationOptions,
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
        continue;
      }

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

  async listen(port?: number): Promise<Server> {
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
    await this.context.close();
  }
}

export const createHttpApplication = async (
  rootModule: ClassType,
  options: HttpApplicationOptions = {},
): Promise<HttpApplication> => {
  const app = new Application();
  const context = await app.bootstrap(rootModule, options);
  return new HttpApplication(app, context, options);
};
