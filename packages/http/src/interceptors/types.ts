import type { Token } from '@nl-framework/core';
import type { HttpExecutionContext } from '../guards/types';

export interface CallHandler<T = unknown> {
  handle(): Promise<T>;
}

export interface BaseInterceptor<C = unknown, TInput = unknown, TOutput = unknown> {
  intercept(context: C, next: CallHandler<TInput>): Promise<TOutput> | TOutput;
}

export type BaseInterceptorFunction<C = unknown> = (
  context: C,
  next: CallHandler,
) => unknown | Promise<unknown>;

export type BaseInterceptorInstance<C = unknown> =
  | BaseInterceptor<C>
  | BaseInterceptorFunction<C>;

export type BaseInterceptorToken<C = unknown> = Token<BaseInterceptor<C>> | BaseInterceptorFunction<C>;

export type HttpInterceptor<TInput = unknown, TOutput = unknown> = BaseInterceptor<
  HttpExecutionContext,
  TInput,
  TOutput
>;

export type InterceptorFunction = BaseInterceptorFunction<HttpExecutionContext>;
export type InterceptorInstance = BaseInterceptorInstance<HttpExecutionContext>;
export type InterceptorToken = BaseInterceptorToken<HttpExecutionContext>;

export type GenericInterceptor<C = unknown, TInput = unknown, TOutput = unknown> = BaseInterceptor<
  C,
  TInput,
  TOutput
>;
export type GenericInterceptorFunction<C = unknown> = BaseInterceptorFunction<C>;
export type GenericInterceptorInstance<C = unknown> = BaseInterceptorInstance<C>;
export type GenericInterceptorToken<C = unknown> = BaseInterceptorToken<C>;
