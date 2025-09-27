import type {
  ControllerDefinition,
  RouteDefinition,
  MiddlewareHandler,
  RequestContext,
} from '../interfaces/http';
import { createRouteMatcher, extractParams } from './path-utils';

interface HandlerEntry {
  controllerInstance: unknown;
  route: RouteDefinition;
  matcher: ReturnType<typeof createRouteMatcher>;
}

export class Router {
  private readonly handlers = new Map<string, HandlerEntry[]>();
  private readonly middleware: MiddlewareHandler[] = [];

  registerController(definition: ControllerDefinition, instance: unknown): void {
    const basePath = definition.prefix ?? '';

    for (const route of definition.routes) {
      let combined = `${basePath ?? ''}/${route.path ?? ''}`;
      combined = combined.replace(/\/+/g, '/');
      if (!combined.startsWith('/')) {
        combined = `/${combined}`;
      }
      if (combined.length > 1 && combined.endsWith('/')) {
        combined = combined.slice(0, -1);
      }
      const fullPath = combined || '/';
      const key = route.method.toUpperCase();
      const matcher = createRouteMatcher(fullPath);

      const entry: HandlerEntry = {
        controllerInstance: instance,
        route,
        matcher,
      };

      if (!this.handlers.has(key)) {
        this.handlers.set(key, []);
      }

      this.handlers.get(key)?.push(entry);
    }
  }

  use(middleware: MiddlewareHandler): void {
    this.middleware.push(middleware);
  }

  async handle(request: Request, container: RequestContext['container']): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const handlers = this.handlers.get(method);

    if (!handlers) {
      return new Response('Not Found', { status: 404 });
    }

    for (const handler of handlers) {
      const params = extractParams(handler.matcher, url.pathname);
      if (params && Object.keys(params).length === handler.matcher.paramNames.length) {
        const controller = handler.controllerInstance as Record<string, unknown>;
        const callable = controller[handler.route.handlerName];
        if (typeof callable === 'function') {
          return this.executePipeline({
            request,
            params,
            callable: callable as (...args: any[]) => unknown,
            controller,
            handler,
            container,
          });
        }
      }
    }

    return new Response('Not Found', { status: 404 });
  }

  private async executePipeline({
    request,
    params,
    callable,
    controller,
    handler,
    container,
  }: {
    request: Request;
    params: Record<string, string>;
  callable: (...args: any[]) => unknown;
  controller: Record<string, unknown>;
    handler: HandlerEntry;
    container: RequestContext['container'];
  }): Promise<Response> {
    const body = await this.readBody(request);

    const context = {
      request,
      params,
      query: new URL(request.url).searchParams,
      headers: request.headers,
      body,
      container,
    };

    let index = -1;

    const dispatch = async (i: number): Promise<Response> => {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;

      const middleware = this.middleware[i];

      if (!middleware) {
        const result = await callable.call(controller, context);
        return this.normalizeResponse(result);
      }

      const next = () => dispatch(i + 1);
      const response = await middleware(context, next);
      return this.normalizeResponse(response);
    };

    return dispatch(0);
  }

  private async readBody(request: Request): Promise<unknown> {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return request.json();
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      return Object.fromEntries(formData.entries());
    }

    if (contentType.includes('text/')) {
      return request.text();
    }

    return request.arrayBuffer();
  }

  private normalizeResponse(result: unknown): Response {
    if (result instanceof Response) {
      return result;
    }

    if (typeof result === 'string' || result instanceof ArrayBuffer) {
      return new Response(result);
    }

    if (typeof result === 'object' && result !== null) {
      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(String(result));
  }
}
