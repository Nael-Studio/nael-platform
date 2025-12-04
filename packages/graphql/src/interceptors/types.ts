import type {
  CallHandler,
  BaseInterceptor,
  BaseInterceptorFunction,
  BaseInterceptorInstance,
  BaseInterceptorToken,
} from '@nl-framework/http';
import type { GraphqlExecutionContext } from '../guards/types';

export type GraphqlCallHandler<T = unknown> = CallHandler<T>;
export type GraphqlInterceptor<TInput = unknown, TOutput = unknown> = BaseInterceptor<
  GraphqlExecutionContext,
  TInput,
  TOutput
>;
export type GraphqlInterceptorFunction = BaseInterceptorFunction<GraphqlExecutionContext>;
export type GraphqlInterceptorInstance = BaseInterceptorInstance<GraphqlExecutionContext>;
export type GraphqlInterceptorToken = BaseInterceptorToken<GraphqlExecutionContext>;
