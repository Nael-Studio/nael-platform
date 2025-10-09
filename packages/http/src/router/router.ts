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
import { isGuardClassToken, isGuardFunctionToken } from '../guards/utils';
import { getRouteArgsMetadata, type RouteArgMetadata } from '../decorators/params';
import { getMetadata } from '../utils/metadata';
import { transformAndValidate, ValidationException } from '../utils/validation';

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
        let args: unknown[];
        try {
          args = await this.resolveHandlerArguments(handler, context, callable);
        } catch (error) {
          if (error instanceof ValidationException) {
            return new Response(
              JSON.stringify({
                message: error.message,
                issues: error.issues,
              }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                },
              },
            );
          }
          throw error;
        }

        const result = await callable.apply(controller, args);
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
    return isGuardClassToken(token);
  }
  private isGuardFunction(token: GuardToken): token is GuardFunction {
    return isGuardFunctionToken(token);
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

  private async resolveHandlerArguments(
    handler: HandlerEntry,
    context: RequestContext,
    callable: (...args: unknown[]) => unknown,
  ): Promise<unknown[]> {
    const metadata = getRouteArgsMetadata(
      handler.controllerClass.prototype,
      handler.route.handlerName,
    );

    if (!metadata.length) {
      return [context];
    }

    const paramTypes = (getMetadata(
      'design:paramtypes',
      handler.controllerClass.prototype,
      handler.route.handlerName,
    ) as unknown[]) ?? [];

    const maxIndex = metadata.reduce((maximum, meta) => Math.max(maximum, meta.index), -1);
    const declaredParams = typeof callable.length === 'number' ? callable.length : 0;
    const parameterCount = Math.max(declaredParams, paramTypes.length, maxIndex + 1);
    const args = new Array(parameterCount).fill(undefined);

    await Promise.all(
      metadata.map(async (meta) => {
        args[meta.index] = await this.resolveArgument(
          meta,
          context,
          paramTypes[meta.index],
        );
      }),
    );

    if (!args.length) {
      return [context];
    }

    for (let index = 0; index < args.length; index += 1) {
      if (args[index] === undefined) {
        args[index] = context;
      }
    }

    return args;
  }

  private async resolveArgument(
    metadata: RouteArgMetadata,
    context: RequestContext,
    metatype: unknown,
  ): Promise<unknown> {
    switch (metadata.type) {
      case 'body':
        return this.transformBodyValue(
          metadata.data ? this.pickFromObject(context.body, metadata.data) : context.body,
          metatype,
        );
      case 'param':
        return metadata.data ? context.params?.[metadata.data] : context.params;
      case 'query':
        if (!metadata.data) {
          return context.query;
        }
        return context.query.get(metadata.data) ?? undefined;
      case 'headers':
        if (!metadata.data) {
          return context.headers;
        }
        return context.headers.get(metadata.data) ?? undefined;
      case 'request':
        return context.request;
      case 'context':
      default:
        return context;
    }
  }

  private isTransformableMetatype(metatype: unknown): metatype is ClassType<unknown> {
    if (typeof metatype !== 'function') {
      return false;
    }

    const primitives: unknown[] = [String, Boolean, Number, Array, Object, Promise, Date];
    return !primitives.includes(metatype);
  }

  private async transformBodyValue(value: unknown, metatype: unknown): Promise<unknown> {
    if (!this.isTransformableMetatype(metatype)) {
      return value;
    }

    return transformAndValidate({
      metatype,
      value,
      sanitize: true,
      validate: true,
    });
  }

  private pickFromObject(source: unknown, path: string): unknown {
    if (path.trim() === '') {
      return source;
    }

    if (source === null || typeof source !== 'object') {
      return undefined;
    }

    const segments = path.split('.');
    let current: unknown = source;
    for (const segment of segments) {
      if (current === null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }
}
