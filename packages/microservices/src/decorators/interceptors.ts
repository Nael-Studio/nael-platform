import 'reflect-metadata';
import type { ClassType } from '@nl-framework/core';
import type { MessagePattern } from '../interfaces/transport';

const INTERCEPTORS_METADATA = Symbol.for('nl:micro:interceptors');

export interface MicroserviceExecutionContext {
  pattern: MessagePattern;
  data: unknown;
}

export interface CallHandler<T = unknown> {
  handle(): Promise<T>;
}

export interface MicroserviceInterceptor<T = unknown> {
  intercept(context: MicroserviceExecutionContext, next: CallHandler): T | Promise<T>;
}

export type InterceptorToken = MicroserviceInterceptor | ClassType<MicroserviceInterceptor>;

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
