import type { ClassType } from '@nl-framework/core';
import type {
  ControllerDefinition,
  RouteDefinition,
  MiddlewareHandler,
  RequestContext,
} from '../interfaces/http';
import { createRouteMatcher, extractParams } from './path-utils';
import { listHttpGuards } from '../registry';
import { listAppliedGuards } from '../guards/metadata';
import { createHttpGuardExecutionContext } from '../guards/execution-context';
import type {
  GuardDecision,
  GuardFunction,
  GuardToken,
  CanActivate,
  HttpExecutionContext,
} from '../guards/types';

interface HandlerEntry {
  controllerInstance: unknown;
  controllerClass: ClassType;
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
        controllerClass: definition.controller,
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

    const context: RequestContext = {
      request,
      params,
      query: new URL(request.url).searchParams,
      headers: request.headers,
      body,
      route: {
        controller: handler.controllerClass,
        handlerName: handler.route.handlerName,
        definition: handler.route,
      },
      container,
    };

    const guardResponse = await this.runGuards(context, handler);
    if (guardResponse) {
      return guardResponse;
    }

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

  private async runGuards(context: RequestContext, handler: HandlerEntry): Promise<Response | null> {
    const guardTokens: GuardToken[] = [
      ...listHttpGuards(),
      ...listAppliedGuards(handler.controllerClass, handler.route.handlerName),
    ];

    if (!guardTokens.length) {
      return null;
    }

    const executionContext = createHttpGuardExecutionContext(context);

    for (const guard of guardTokens) {
      const result = await this.invokeGuard(guard, context, executionContext);
      if (result instanceof Response) {
        return result;
      }
      if (result === false) {
        return new Response('Forbidden', { status: 403 });
      }
    }

    return null;
  }

  private isClassGuardToken(token: GuardToken): token is ClassType<CanActivate> {
    return (
      typeof token === 'function' &&
      Object.prototype.hasOwnProperty.call(token, 'prototype') &&
      typeof (token as { prototype?: { canActivate?: unknown } }).prototype?.canActivate === 'function'
    );
  }

  private isGuardFunction(token: GuardToken): token is GuardFunction {
    return typeof token === 'function' && !this.isClassGuardToken(token);
  }

  private async invokeGuard(
    token: GuardToken,
    context: RequestContext,
    executionContext: HttpExecutionContext,
  ): Promise<GuardDecision> {
    if (this.isGuardFunction(token)) {
      return token(executionContext);
    }

    const instance = (await context.container.resolve(
      token as Parameters<RequestContext['container']['resolve']>[0],
    )) as CanActivate | undefined;
    if (typeof instance?.canActivate !== 'function') {
      throw new Error('Resolved guard does not implement canActivate');
    }

    return instance.canActivate(executionContext);
  }
}
