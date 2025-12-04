import type { Token } from '@nl-framework/core';
import type { Logger } from '@nl-framework/logger';
import { listMessageHandlers } from '../decorators/patterns';
import type { MessagePattern } from '../interfaces/transport';
import { listMicroserviceExceptionFilters } from '../filters/registry';
import type { MicroserviceExceptionFilter } from '../filters/exception-filter.interface';
import { createMicroserviceExceptionContext } from '../filters/execution-context';
import type { MicroserviceExceptionFilterToken } from '../filters/types';

interface RegisteredHandler {
  pattern: MessagePattern;
  isEvent: boolean;
  controller: Record<string, unknown>;
  methodName: string;
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
    const ControllerClass = controller.constructor as { new (...args: unknown[]): object } | undefined;
    if (!ControllerClass) {
      throw new Error('Controller instance must have a constructor.');
    }

    const definitions = listMessageHandlers(ControllerClass);
    for (const definition of definitions) {
      this.handlers.push({
        pattern: definition.metadata.pattern,
        isEvent: definition.metadata.isEvent,
        controller: controller as Record<string, unknown>,
        methodName: definition.propertyKey,
        filters: definition.filters as MicroserviceExceptionFilterToken[],
      });
    }
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

    try {
      const result = await method.call(handler.controller, data);
      return handler.isEvent ? undefined : result;
    } catch (error) {
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

  private async collectExceptionFilters(handler: RegisteredHandler): Promise<MicroserviceExceptionFilter[]> {
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
