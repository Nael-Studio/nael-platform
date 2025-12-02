import 'reflect-metadata';
import type { ClassType } from '../interfaces/provider';

export type InterceptorContext = {
  request?: unknown;
  response?: unknown;
  args?: unknown[];
  pattern?: unknown;
  data?: unknown;
};

export interface CallHandler<T = unknown> {
  handle(): Promise<T>;
}

export interface Interceptor<T = unknown> {
  intercept(context: InterceptorContext, next: CallHandler): T | Promise<T>;
}

export type InterceptorToken = Interceptor | ClassType<Interceptor>;

const INTERCEPTORS_METADATA = Symbol.for('nl:core:interceptors');

export const UseInterceptors = (...interceptors: InterceptorToken[]): ClassDecorator & MethodDecorator =>
  (target: object, propertyKey?: string | symbol) => {
    if (propertyKey) {
      Reflect.defineMetadata(INTERCEPTORS_METADATA, interceptors, target, propertyKey);
    } else {
      Reflect.defineMetadata(INTERCEPTORS_METADATA, interceptors, target);
    }
  };

export function getInterceptors(
  target: object,
  propertyKey?: string | symbol,
): InterceptorToken[] | undefined {
  if (propertyKey) {
    return Reflect.getMetadata(INTERCEPTORS_METADATA, target, propertyKey) as InterceptorToken[] | undefined;
  }
  return Reflect.getMetadata(INTERCEPTORS_METADATA, target) as InterceptorToken[] | undefined;
}
