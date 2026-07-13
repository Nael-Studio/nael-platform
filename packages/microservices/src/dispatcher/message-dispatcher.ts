import {
  ApplicationException,
  RequestContext,
  createRequestContextData,
  type ClassType,
  type Token,
} from '@nl-framework/core';
import type { Logger } from '@nl-framework/logger';
import { listMessageHandlers } from '../decorators/patterns';
import type { MessageContext, MessagePattern } from '../interfaces/transport';
import { listMicroserviceExceptionFilters } from '../filters/registry';
import type { MicroserviceExceptionFilter } from '../filters/exception-filter.interface';
import { createMicroserviceExceptionContext } from '../filters/execution-context';
import type { MicroserviceExceptionFilterToken } from '../filters/types';
import {
  createMicroserviceExecutionContext,
  type MicroserviceExecutionContext,
} from '../guards/execution-context';
import { listMicroserviceGuards } from '../guards/registry';
import type { MicroserviceCanActivate, MicroserviceGuardFunction } from '../guards/types';
import { listMicroserviceInterceptors } from '../interceptors/registry';
import type {
  CallHandler,
  MicroserviceInterceptor,
  MicroserviceInterceptorFunction,
} from '../interceptors/types';
import type {
  MicroserviceArgumentMetadata,
  MicroservicePipeTransform,
} from '../pipes/pipe-transform.interface';

/**
 * Sentinel returned when a pub/sub *event* is denied by a guard. Surfaced to the
 * Dapr subscription endpoint as `{"status":"DROP"}` so the message is not retried.
 */
export const MICROSERVICE_DROP = { status: 'DROP' } as const;
export type MicroserviceDropStatus = typeof MICROSERVICE_DROP;

export const isMicroserviceDropStatus = (value: unknown): value is MicroserviceDropStatus =>
  typeof value === 'object' &&
  value !== null &&
  (value as { status?: unknown }).status === 'DROP';

interface RegisteredHandler {
  pattern: MessagePattern;
  isEvent: boolean;
  controller: Record<string, unknown>;
  controllerClass: ClassType;
  methodName: string;
  guards: unknown[];
  interceptors: unknown[];
  pipes: unknown[];
  filters: MicroserviceExceptionFilterToken[];
}

export interface MessageDispatcherOptions {
  resolve?: <T>(token: Token<T>) => Promise<T> | T;
  logger?: Logger;
}

export class MessageDispatcher {
  private readonly handlers: RegisteredHandler[] = [];

  constructor(private readonly options: MessageDispatcherOptions = {}) {}

  registerController(controller: object): void {
    const ControllerClass = controller.constructor as ClassType | undefined;
    if (!ControllerClass) {
      throw new Error('Controller instance must have a constructor.');
    }

    const definitions = listMessageHandlers(ControllerClass);
    for (const definition of definitions) {
      this.handlers.push({
        pattern: definition.metadata.pattern,
        isEvent: definition.metadata.isEvent,
        controller: controller as Record<string, unknown>,
        controllerClass: ControllerClass,
        methodName: definition.propertyKey,
        guards: definition.guards,
        interceptors: definition.interceptors,
        pipes: definition.pipes,
        filters: definition.filters as MicroserviceExceptionFilterToken[],
      });
    }
  }

  /** The patterns this dispatcher can handle, in registration order. */
  getHandlers(): ReadonlyArray<{ pattern: MessagePattern; isEvent: boolean; methodName: string }> {
    return this.handlers.map((handler) => ({
      pattern: handler.pattern,
      isEvent: handler.isEvent,
      methodName: handler.methodName,
    }));
  }

  async dispatch(
    pattern: MessagePattern,
    data: unknown,
    metadata?: Record<string, string>,
  ): Promise<unknown> {
    const handler = this.handlers.find((entry) => this.matchPattern(entry.pattern, pattern));
    if (!handler) {
      throw new Error(`No handler found for pattern: ${JSON.stringify(pattern)}`);
    }

    const method = handler.controller[handler.methodName as keyof typeof handler.controller];
    if (typeof method !== 'function') {
      throw new Error(`Handler ${String(handler.methodName)} is not callable.`);
    }

    const boundHandler = (method as (...args: unknown[]) => unknown).bind(handler.controller);
    const context = createMicroserviceExecutionContext({
      pattern,
      payload: data,
      metadata,
      controller: handler.controller,
      handler: boundHandler,
      handlerName: handler.methodName,
      controllerClass: handler.controllerClass,
    });

    // Open an ambient request context so logs and instrumentation correlate with
    // this message dispatch. Reuse an inbound correlation id from metadata if present.
    const requestContextData = createRequestContextData({
      kind: 'message',
      name: typeof pattern === 'string' ? pattern : JSON.stringify(pattern),
      requestId: metadata?.['x-request-id'],
    });

    return RequestContext.run(requestContextData, () =>
      this.runPipeline(
        handler,
        context,
        method as (...args: unknown[]) => unknown,
        pattern,
        data,
        metadata,
      ),
    );
  }

  private async runPipeline(
    handler: RegisteredHandler,
    context: MicroserviceExecutionContext,
    method: (...args: unknown[]) => unknown,
    pattern: MessagePattern,
    data: unknown,
    metadata?: Record<string, string>,
  ): Promise<unknown> {
    // 1. Guards — deny before any interceptor, pipe, or the handler runs.
    const allowed = await this.runGuards(handler, context);
    if (!allowed) {
      const forbidden = ApplicationException.forbidden(
        `Access to pattern ${JSON.stringify(pattern)} was denied by a guard.`,
      );
      const handled = await this.handleException(handler, forbidden, pattern, data, metadata);
      if (handler.isEvent) {
        // A denied event must not be retried by the broker.
        return MICROSERVICE_DROP;
      }
      if (typeof handled !== 'undefined') {
        return handled;
      }
      throw forbidden;
    }

    // 2. Interceptors (pre) wrap 3. pipes + 4. handler, then run (post).
    try {
      const result = await this.executeInterceptors(handler, context, async () => {
        const payload = await this.applyPipes(handler, data, pattern);
        const messageContext: MessageContext = { pattern, data: payload, metadata };
        return method.call(handler.controller, payload, messageContext);
      });
      return handler.isEvent ? undefined : result;
    } catch (error) {
      // 5. Filters on any throw.
      const handled = await this.handleException(handler, error, pattern, data, metadata);
      if (typeof handled !== 'undefined') {
        return handler.isEvent ? undefined : handled;
      }
      throw error;
    }
  }

  private matchPattern(left: MessagePattern, right: MessagePattern): boolean {
    if (typeof left === 'string' && typeof right === 'string') {
      return left === right;
    }
    return JSON.stringify(left) === JSON.stringify(right);
  }

  // --- Guards ---------------------------------------------------------------

  private async runGuards(
    handler: RegisteredHandler,
    context: MicroserviceExecutionContext,
  ): Promise<boolean> {
    const tokens = [...listMicroserviceGuards(), ...handler.guards];
    for (const token of tokens) {
      const decision = await this.invokeGuard(token, context);
      if (decision === false) {
        return false;
      }
    }
    return true;
  }

  private async invokeGuard(
    token: unknown,
    context: MicroserviceExecutionContext,
  ): Promise<void | boolean> {
    if (this.isFunctionToken(token, 'canActivate')) {
      return (token as MicroserviceGuardFunction)(context);
    }
    const instance = await this.resolveInstance<MicroserviceCanActivate>(token);
    if (!instance || typeof instance.canActivate !== 'function') {
      throw new Error('Resolved microservice guard does not implement canActivate().');
    }
    return instance.canActivate(context);
  }

  // --- Interceptors ---------------------------------------------------------

  private async executeInterceptors(
    handler: RegisteredHandler,
    context: MicroserviceExecutionContext,
    finalHandler: () => Promise<unknown>,
  ): Promise<unknown> {
    const tokens = [...listMicroserviceInterceptors(), ...handler.interceptors];
    if (!tokens.length) {
      return finalHandler();
    }

    const dispatch = async (index: number): Promise<unknown> => {
      if (index >= tokens.length) {
        return finalHandler();
      }
      const token = tokens[index];
      const next: CallHandler = { handle: () => dispatch(index + 1) };

      if (this.isFunctionToken(token, 'intercept')) {
        return (token as MicroserviceInterceptorFunction)(context, next);
      }
      const instance = await this.resolveInstance<MicroserviceInterceptor>(token);
      if (!instance || typeof instance.intercept !== 'function') {
        throw new Error('Resolved microservice interceptor does not implement intercept().');
      }
      return instance.intercept(context, next);
    };

    return dispatch(0);
  }

  // --- Pipes ----------------------------------------------------------------

  private async applyPipes(
    handler: RegisteredHandler,
    data: unknown,
    pattern: MessagePattern,
  ): Promise<unknown> {
    if (!handler.pipes.length) {
      return data;
    }
    const metadata: MicroserviceArgumentMetadata = { type: 'payload', data: pattern };
    let value = data;
    for (const token of handler.pipes) {
      const pipe = await this.resolvePipe(token);
      value = await pipe.transform(value, metadata);
    }
    return value;
  }

  private async resolvePipe(token: unknown): Promise<MicroservicePipeTransform> {
    if (this.isPipeInstance(token)) {
      return token;
    }
    const instance = await this.resolveInstance<MicroservicePipeTransform>(token);
    if (this.isPipeInstance(instance)) {
      return instance;
    }
    throw new Error('Unable to resolve microservice pipe token.');
  }

  private isPipeInstance(value: unknown): value is MicroservicePipeTransform {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { transform?: unknown }).transform === 'function'
    );
  }

  // --- Shared resolution ----------------------------------------------------

  /**
   * A token is treated as a *function* form (guard fn / interceptor fn) when it
   * is a plain function whose prototype does NOT expose the class method
   * (`canActivate` / `intercept`). Class tokens resolve through DI instead.
   */
  private isFunctionToken(token: unknown, classMethod: string): boolean {
    if (typeof token !== 'function') {
      return false;
    }
    const prototype = (token as { prototype?: Record<string, unknown> }).prototype;
    return typeof prototype?.[classMethod] !== 'function';
  }

  private async resolveInstance<T>(token: unknown): Promise<T> {
    if (typeof token !== 'function') {
      // A DI token (symbol/string) resolves through the container; a bare
      // instance is used as-is.
      if (this.options.resolve && (typeof token === 'symbol' || typeof token === 'string')) {
        return (await this.options.resolve(token as Token<T>)) as T;
      }
      return token as T;
    }

    if (this.options.resolve) {
      try {
        const resolved = await this.options.resolve(token as Token<T>);
        if (resolved) {
          return resolved as T;
        }
      } catch {
        // Not registered in the container — fall back to direct construction.
      }
    }
    return new (token as new () => T)();
  }

  // --- Exception filters ----------------------------------------------------

  private async handleException(
    handler: RegisteredHandler,
    error: unknown,
    pattern: MessagePattern,
    data: unknown,
    metadata?: Record<string, string>,
  ): Promise<unknown | undefined> {
    const filters = await this.collectExceptionFilters(handler);
    if (!filters.length) {
      return undefined;
    }

    const context = createMicroserviceExceptionContext({
      pattern,
      data,
      metadata,
      controller: handler.controller,
      handlerName: handler.methodName,
      isEvent: handler.isEvent,
      logger: this.options.logger,
    });

    const exception = error instanceof Error ? error : new Error(String(error));

    for (const filter of filters) {
      const result = await filter.catch(exception, context);
      if (typeof result !== 'undefined') {
        return result;
      }
    }

    return undefined;
  }

  private async collectExceptionFilters(
    handler: RegisteredHandler,
  ): Promise<MicroserviceExceptionFilter[]> {
    const tokens: MicroserviceExceptionFilterToken[] = [
      ...listMicroserviceExceptionFilters(),
      ...(handler.filters ?? []),
    ];

    const instances: MicroserviceExceptionFilter[] = [];
    for (const token of tokens) {
      const filter = await this.resolveExceptionFilter(token);
      instances.push(filter);
    }
    return instances;
  }

  private async resolveExceptionFilter(
    token: MicroserviceExceptionFilterToken,
  ): Promise<MicroserviceExceptionFilter> {
    if (this.isFilterInstance(token)) {
      return token;
    }

    if (this.options.resolve) {
      const resolved = await this.options.resolve(token as Token<MicroserviceExceptionFilter>);
      if (resolved && this.isFilterInstance(resolved)) {
        return resolved;
      }
    }

    if (typeof token === 'function') {
      const instance = new (token as new () => MicroserviceExceptionFilter)();
      if (this.isFilterInstance(instance)) {
        return instance;
      }
    }

    throw new Error('Unable to resolve microservice exception filter token.');
  }

  private isFilterInstance(value: unknown): value is MicroserviceExceptionFilter {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { catch?: unknown }).catch === 'function'
    );
  }
}
