import type { Token } from '@nl-framework/core';
import type { MicroserviceExecutionContext } from '../guards/execution-context';

/** Advances to the next interceptor, or ultimately the handler. */
export interface CallHandler<T = unknown> {
  handle(): Promise<T>;
}

export interface MicroserviceInterceptor<TInput = unknown, TOutput = unknown> {
  intercept(
    context: MicroserviceExecutionContext,
    next: CallHandler<TInput>,
  ): Promise<TOutput> | TOutput;
}

export type MicroserviceInterceptorFunction = (
  context: MicroserviceExecutionContext,
  next: CallHandler,
) => unknown | Promise<unknown>;

export type MicroserviceInterceptorToken =
  | Token<MicroserviceInterceptor>
  | MicroserviceInterceptorFunction;
