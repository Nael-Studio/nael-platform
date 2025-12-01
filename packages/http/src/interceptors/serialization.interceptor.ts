import { serialize, getSerializationOptions, type SerializationOptions } from '@nl-framework/core';
import type { HttpExecutionContext } from '../guards/types';
import type { CallHandler, HttpInterceptor } from './types';

export interface HttpSerializationInterceptorOptions {
  transformOptions?: SerializationOptions;
  shouldSerialize?: (value: unknown) => boolean;
}

const isSkippable = (value: unknown): boolean =>
  value instanceof Response ||
  value instanceof ReadableStream ||
  value instanceof ArrayBuffer ||
  value instanceof Uint8Array ||
  (typeof Buffer !== 'undefined' && value instanceof Buffer);

export class HttpSerializationInterceptor implements HttpInterceptor {
  constructor(private readonly options: HttpSerializationInterceptorOptions = {}) {}

  async intercept(context: HttpExecutionContext, next: CallHandler): Promise<unknown> {
    const result = await next.handle();

    if (!this.shouldSerialize(result)) {
      return result;
    }

    const route = context.getRoute();
    const decoratorOptions = route
      ? getSerializationOptions(route.controller, route.handlerName)
      : undefined;

    const mergedOptions = {
      ...(this.options.transformOptions ?? {}),
      ...(decoratorOptions ?? {}),
    };

    return serialize(result, mergedOptions);
  }

  private shouldSerialize(value: unknown): boolean {
    if (this.options.shouldSerialize) {
      return this.options.shouldSerialize(value);
    }

    if (isSkippable(value)) {
      return false;
    }

    return true;
  }
}
