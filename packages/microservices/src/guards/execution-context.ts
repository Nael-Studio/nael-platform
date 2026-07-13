import type { ClassType } from '@nl-framework/core';
import type { MessagePattern } from '../interfaces/transport';

/**
 * Runtime context handed to microservice guards and interceptors. It mirrors the
 * HTTP execution context's *shape* (a bag of `get*` accessors) so that a guard
 * shared between transports can branch on which methods are present — HTTP
 * exposes `getRequest()/getRoute()`, a microservice exposes `getPattern()/
 * getPayload()/getMetadata()`.
 */
export interface MicroserviceExecutionContext {
  /** The message/event pattern that selected this handler. */
  getPattern(): MessagePattern;
  /** The deserialized message payload (post-pipe value is not reflected here). */
  getPayload<T = unknown>(): T;
  /** Transport metadata envelope (e.g. Dapr headers), if any. */
  getMetadata(): Record<string, string> | undefined;
  /** The handler function about to run, bound to its controller. */
  getHandler(): (...args: unknown[]) => unknown;
  /** The controller class, when known. */
  getClass(): ClassType | undefined;
  /** The handler method name. */
  getHandlerName(): string | undefined;
  /** The controller instance the handler belongs to. */
  getController(): object;
}

export interface MicroserviceExecutionContextOptions {
  pattern: MessagePattern;
  payload: unknown;
  metadata?: Record<string, string>;
  controller: object;
  handler: (...args: unknown[]) => unknown;
  handlerName: string;
  controllerClass?: ClassType;
}

class MicroserviceExecutionContextImpl implements MicroserviceExecutionContext {
  constructor(private readonly options: MicroserviceExecutionContextOptions) {}

  getPattern(): MessagePattern {
    return this.options.pattern;
  }

  getPayload<T = unknown>(): T {
    return this.options.payload as T;
  }

  getMetadata(): Record<string, string> | undefined {
    return this.options.metadata;
  }

  getHandler(): (...args: unknown[]) => unknown {
    return this.options.handler;
  }

  getClass(): ClassType | undefined {
    return this.options.controllerClass;
  }

  getHandlerName(): string | undefined {
    return this.options.handlerName;
  }

  getController(): object {
    return this.options.controller;
  }
}

export const createMicroserviceExecutionContext = (
  options: MicroserviceExecutionContextOptions,
): MicroserviceExecutionContext => new MicroserviceExecutionContextImpl(options);
