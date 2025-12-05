import type { ClassType } from '@nl-framework/core';
import type { Logger } from '@nl-framework/logger';
import type {
  ControllerDefinition,
  RouteDefinition,
  MiddlewareHandler,
  RequestContext,
} from '../interfaces/http';
import { createRouteMatcher, extractParams } from './path-utils';
import { listHttpGuards, listHttpInterceptors } from '../registry';
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
import { transformAndValidate, ValidationException, ApplicationException, getHttpStatusFromException } from '@nl-framework/core';
import { listExceptionFilters } from '../filters/registry';
import { listAppliedFilters } from '../filters/metadata';
import type { ExceptionFilter } from '../filters/exception-filter.interface';
import type { ExceptionFilterToken } from '../filters/types';
import { HttpException } from '../exceptions/http-exception';
import { getAllPipes } from '../pipes/pipes.metadata';
import type { PipeTransform, ArgumentMetadata, PipeToken } from '../pipes/pipe-transform.interface';
import { listAppliedInterceptors } from '../interceptors/metadata';
import { createHttpInterceptorExecutionContext } from '../interceptors/execution-context';
import type {
  CallHandler,
  InterceptorInstance,
  InterceptorToken,
  HttpInterceptor,
} from '../interceptors/types';
import {
  isInterceptorClassToken as isInterceptorClassTokenUtil,
  isInterceptorFunctionToken as isInterceptorFunctionTokenUtil,
} from '../interceptors/utils';
import { getDeclaredVersions } from '../versioning/metadata';
import { DEFAULT_VERSIONING_OPTIONS, type HttpVersioningOptions } from '../versioning/options';

interface HandlerEntry {
  controllerInstance: unknown;
  controllerClass: ClassType;
  route: RouteDefinition;
  matcher: ReturnType<typeof createRouteMatcher>;
}

export class Router {
  private readonly handlers = new Map<string, HandlerEntry[]>();
  private readonly middleware: MiddlewareHandler[] = [];
  private logger?: Logger;

  constructor(
    private readonly options: {
      versioning?: HttpVersioningOptions;
      logger?: Logger;
    } = {},
  ) {
    this.logger = options.logger;
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  registerController(definition: ControllerDefinition, instance: unknown): void {
    const basePath = definition.prefix ?? '';

    const controllerVersions = getDeclaredVersions(definition.controller);

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
        route: {
          ...route,
          versions:
            getDeclaredVersions(definition.controller.prototype, route.handlerName) ??
            controllerVersions,
        },
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

    const versioning = { ...DEFAULT_VERSIONING_OPTIONS, ...(this.options.versioning ?? {}) };
    const { version: requestVersion, pathname } = this.resolveRequestVersion(request, url.pathname, versioning);

    let bestMatch:
      | {
        handler: HandlerEntry;
        params: Record<string, string>;
        score: number;
      }
      | null = null;

    for (const handler of handlers) {
      const params = extractParams(handler.matcher, pathname);
      if (!params || Object.keys(params).length !== handler.matcher.paramNames.length) {
        continue;
      }

      const score = this.computeVersionScore(handler.route.versions, requestVersion, versioning.enabled);
      if (score < 0) {
        continue;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { handler, params, score };
      }
    }

    if (!bestMatch) {
      return new Response('Not Found', { status: 404 });
    }

    const controller = bestMatch.handler.controllerInstance as Record<string, unknown>;
    const callable = controller[bestMatch.handler.route.handlerName];
    if (typeof callable !== 'function') {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const response = await this.executePipeline({
        request,
        params: bestMatch.params,
        callable: callable as (...args: any[]) => unknown,
        controller,
        handler: bestMatch.handler,
        container,
        version: requestVersion,
      });
      return this.applyVersionHeader(response, requestVersion, versioning);
    } catch (error) {
      return this.handleException(error, {
        request,
        params: bestMatch.params,
        query: url.searchParams,
        headers: request.headers,
        body: undefined,
        route: {
          controller: bestMatch.handler.controllerClass,
          handlerName: bestMatch.handler.route.handlerName,
          definition: bestMatch.handler.route,
        },
        container,
        version: requestVersion,
      }, bestMatch.handler);
    }
  }

  private resolveRequestVersion(
    request: Request,
    pathname: string,
    options: typeof DEFAULT_VERSIONING_OPTIONS & HttpVersioningOptions,
  ): { version?: string; pathname: string } {
    if (!options.enabled) {
      return { version: undefined, pathname };
    }

    const strategies = options.strategies?.length
      ? options.strategies
      : DEFAULT_VERSIONING_OPTIONS.strategies;

    let resolvedPath = pathname || '/';
    let version: string | undefined;

    for (const strategy of strategies) {
      if (strategy === 'uri') {
        const prefix = options.uriPrefix ?? DEFAULT_VERSIONING_OPTIONS.uriPrefix;
        const regex = new RegExp(`^/${prefix}(\\w+)(/.*)?$`, 'i');
        const match = resolvedPath.match(regex);
        if (match) {
          version = match[1];
          resolvedPath = match[2] ? match[2] : '/';
          break;
        }
      } else if (strategy === 'header') {
        const headerName = options.headerName ?? DEFAULT_VERSIONING_OPTIONS.headerName;
        const value = request.headers.get(headerName);
        if (value) {
          version = value.trim();
          break;
        }
      } else if (strategy === 'media') {
        const param = options.mediaParameter ?? DEFAULT_VERSIONING_OPTIONS.mediaParameter;
        const extracted = this.extractMediaVersion(request.headers.get('accept'), param);
        if (extracted) {
          version = extracted;
          break;
        }
      }
    }

    if (!version && options.defaultVersion) {
      version = options.defaultVersion;
    }

    return {
      version,
      pathname: resolvedPath || '/',
    };
  }

  private extractMediaVersion(acceptHeader: string | null, param: string): string | undefined {
    if (!acceptHeader) {
      return undefined;
    }
    const parts = acceptHeader.split(',');
    for (const part of parts) {
      const match = part.match(new RegExp(`;\\s*${param}=([^;\\s]+)`, 'i'));
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  private computeVersionScore(
    routeVersions: string[] | undefined,
    requestVersion: string | undefined,
    versioningEnabled: boolean,
  ): number {
    if (!versioningEnabled) {
      return 0;
    }

    if (routeVersions && routeVersions.length) {
      if (requestVersion && routeVersions.includes(requestVersion)) {
        return 2;
      }
      return -1;
    }

    return 1; // wildcard (works for any version)
  }

  private applyVersionHeader(
    response: Response,
    version: string | undefined,
    options: typeof DEFAULT_VERSIONING_OPTIONS & HttpVersioningOptions,
  ): Response {
    if (!options.enabled || !options.responseHeader || !version) {
      return response;
    }

    if (response.headers.has(options.responseHeader)) {
      return response;
    }

    const headers = new Headers(response.headers);
    headers.set(options.responseHeader, version);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  private async handleException(
    error: unknown,
    context: RequestContext,
    handler?: HandlerEntry,
  ): Promise<Response> {
    const exception = error instanceof Error ? error : new Error(String(error));
    const filters = await this.collectExceptionFilters(context, handler);

    for (const filter of filters) {
      try {
        return await filter.catch(exception, context);
      } catch {
        // If a filter throws, continue to the next one
        continue;
      }
    }

    // Default error handling if no filters or all filters failed
    if (exception instanceof ApplicationException) {
      const status = getHttpStatusFromException(exception);
      return new Response(
        JSON.stringify({
          statusCode: status,
          code: exception.code,
          message: exception.message,
          details: exception.details,
        }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (exception instanceof HttpException) {
      return new Response(
        JSON.stringify({
          statusCode: exception.status,
          message: exception.message,
        }),
        {
          status: exception.status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    this.logger?.error('Unhandled exception in HTTP handler', {
      error: exception,
      path: context.request.url,
      method: context.request.method,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const payload: Record<string, unknown> = {
      statusCode: 500,
      message: 'Internal Server Error',
    };

    if (!isProduction) {
      payload.error = exception.message;
      payload.stack = exception.stack;
      if (exception.cause) {
        payload.cause = exception.cause;
      }
    }

    return new Response(JSON.stringify(payload), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async collectExceptionFilters(
    context: RequestContext,
    handler?: HandlerEntry,
  ): Promise<ExceptionFilter[]> {
    const filters: ExceptionFilter[] = [...listExceptionFilters()];

    if (!handler) {
      return filters;
    }

    const scopedTokens = listAppliedFilters<ExceptionFilterToken>(
      handler.controllerClass,
      handler.route.handlerName,
    );

    for (const token of scopedTokens) {
      const resolved = await this.resolveExceptionFilter(token, context);
      filters.push(resolved);
    }

    return filters;
  }

  private async resolveExceptionFilter(
    token: ExceptionFilterToken,
    context: RequestContext,
  ): Promise<ExceptionFilter> {
    if (this.isExceptionFilterInstance(token)) {
      return token;
    }

    const resolverToken = token as Parameters<RequestContext['container']['resolve']>[0];

    try {
      const resolved = await context.container.resolve(resolverToken);
      if (this.isExceptionFilterInstance(resolved)) {
        return resolved;
      }
    } catch (error) {
      if (!this.isExceptionFilterClass(token)) {
        throw error;
      }
    }

    if (this.isExceptionFilterClass(token)) {
      const FilterType = token as ClassType<ExceptionFilter>;
      const instance = new FilterType();
      if (this.isExceptionFilterInstance(instance)) {
        return instance;
      }
    }

    throw new Error('Unable to resolve exception filter token');
  }

  private isExceptionFilterInstance(value: unknown): value is ExceptionFilter {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { catch?: unknown }).catch === 'function'
    );
  }

  private isExceptionFilterClass(token: unknown): token is ClassType<ExceptionFilter> {
    return (
      typeof token === 'function' &&
      typeof (token as { prototype?: { catch?: unknown } }).prototype?.catch === 'function'
    );
  }

  private async executePipeline({
    request,
    params,
    callable,
    controller,
    handler,
    container,
    version,
  }: {
    request: Request;
    params: Record<string, string>;
    callable: (...args: any[]) => unknown;
    controller: Record<string, unknown>;
    handler: HandlerEntry;
    container: RequestContext['container'];
    version?: string;
  }): Promise<Response> {
    const body = await this.readBody(request);

    const context: RequestContext = {
      request,
      params,
      query: new URL(request.url).searchParams,
      headers: request.headers,
      body,
      version,
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
        const finalHandler = async (): Promise<unknown> => {
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

          return callable.apply(controller, args);
        };

        const result = await this.executeInterceptors(context, handler, finalHandler);
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

  private async executeInterceptors(
    context: RequestContext,
    handler: HandlerEntry,
    finalHandler: () => Promise<unknown>,
  ): Promise<unknown> {
    const interceptorTokens: InterceptorToken[] = [
      ...listHttpInterceptors(),
      ...listAppliedInterceptors(handler.controllerClass, handler.route.handlerName),
    ];

    if (!interceptorTokens.length) {
      return finalHandler();
    }

    const executionContext = createHttpInterceptorExecutionContext(context);

    const dispatch = async (index: number): Promise<unknown> => {
      if (index >= interceptorTokens.length) {
        return finalHandler();
      }

      const token = interceptorTokens[index]!;
      const interceptor = await this.resolveInterceptor(token, context);

      const nextHandler: CallHandler = {
        handle: () => dispatch(index + 1),
      };

      if (typeof interceptor === 'function' && isInterceptorFunctionTokenUtil(token)) {
        return interceptor(executionContext, nextHandler);
      }

      if (typeof (interceptor as { intercept?: unknown }).intercept !== 'function') {
        throw new Error('Resolved interceptor does not implement intercept()');
      }

      return (interceptor as InterceptorInstance & { intercept: Function }).intercept(
        executionContext,
        nextHandler,
      );
    };

    return dispatch(0);
  }

  private async resolveInterceptor(
    token: InterceptorToken,
    context: RequestContext,
  ): Promise<InterceptorInstance> {
    if (isInterceptorFunctionTokenUtil(token)) {
      return token;
    }

    const resolverToken = token as Parameters<RequestContext['container']['resolve']>[0];

    try {
      const resolved = await context.container.resolve(resolverToken);
      if (resolved) {
        return resolved as InterceptorInstance;
      }
    } catch (error) {
      if (!isInterceptorClassTokenUtil(token)) {
        throw error;
      }
    }

    if (isInterceptorClassTokenUtil(token)) {
      const InterceptorType = token as ClassType<HttpInterceptor>;
      return new InterceptorType();
    }

    throw new Error('Unable to resolve interceptor token');
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
        let value = await this.resolveArgument(
          meta,
          context,
          paramTypes[meta.index],
        );

        // Apply pipes to the parameter
        const pipes = getAllPipes(
          handler.controllerClass.prototype,
          handler.route.handlerName,
          meta.index,
        );

        if (pipes.length > 0) {
          value = await this.applyPipes(
            value,
            {
              type: meta.type,
              metatype: paramTypes[meta.index],
              data: meta.data,
            },
            pipes,
            context,
          );
        }

        args[meta.index] = value;
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

  private async applyPipes(
    value: unknown,
    metadata: ArgumentMetadata,
    pipes: PipeToken[],
    context: RequestContext,
  ): Promise<unknown> {
    let transformedValue = value;

    for (const pipe of pipes) {
      const pipeInstance = await this.resolvePipe(pipe, context);
      transformedValue = await pipeInstance.transform(transformedValue, metadata);
    }

    return transformedValue;
  }

  private async resolvePipe(
    pipe: PipeToken,
    context: RequestContext,
  ): Promise<PipeTransform> {
    if (typeof pipe === 'function') {
      // It's a class, resolve from container
      try {
        return (await context.container.resolve(pipe as ClassType)) as PipeTransform;
      } catch {
        // If not in container, instantiate it
        return new (pipe as any)() as PipeTransform;
      }
    }
    // It's already an instance
    return pipe;
  }

  private async resolveArgument(
    metadata: RouteArgMetadata,
    context: RequestContext,
    metatype: unknown,
  ): Promise<unknown> {
    const stringData = typeof metadata.data === 'string' ? metadata.data : undefined;
    switch (metadata.type) {
      case 'body':
        return this.transformBodyValue(
          stringData ? this.pickFromObject(context.body, stringData) : context.body,
          metatype,
        );
      case 'param':
        return stringData ? context.params?.[stringData] : context.params;
      case 'query':
        if (!stringData) {
          return context.query;
        }
        return context.query.get(stringData) ?? undefined;
      case 'headers':
        if (!stringData) {
          return context.headers;
        }
        return context.headers.get(stringData) ?? undefined;
      case 'request':
        return context.request;
      case 'custom':
        if (!metadata.factory) {
          return undefined;
        }
        return metadata.factory(metadata.data, context, metatype);
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
