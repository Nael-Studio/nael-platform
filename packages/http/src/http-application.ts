import type { ClassType, ApplicationOptions, Token, ApplicationContext } from '@nl-framework/core';
import { Application, getControllerPrefix } from '@nl-framework/core';
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

  constructor(
    private readonly app: Application,
    private readonly context: ApplicationContext,
    private readonly options: HttpApplicationOptions,
  ) {
    this.registerControllers();
    for (const middleware of options.middleware ?? []) {
      this.router.use(middleware);
    }
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
