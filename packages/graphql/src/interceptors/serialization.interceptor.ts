import { serialize, getSerializationOptions, type SerializationOptions } from '@nl-framework/core';
import type { GraphqlExecutionContext } from '../guards/types';
import type { GraphqlCallHandler, GraphqlInterceptor } from './types';

export interface GraphqlSerializationInterceptorOptions {
  transformOptions?: SerializationOptions;
  shouldSerialize?: (value: unknown) => boolean;
}

const isSkippable = (value: unknown): boolean =>
  value instanceof Response ||
  value instanceof ReadableStream ||
  value instanceof ArrayBuffer ||
  value instanceof Uint8Array ||
  (typeof Buffer !== 'undefined' && value instanceof Buffer);

export class GraphqlSerializationInterceptor implements GraphqlInterceptor {
  constructor(private readonly options: GraphqlSerializationInterceptorOptions = {}) {}

  async intercept(context: GraphqlExecutionContext, next: GraphqlCallHandler): Promise<unknown> {
    const result = await next.handle();

    if (!this.shouldSerialize(result)) {
      return result;
    }

    const resolverClass = context.getResolverClass();
    const resolverHandler = context.getResolverHandlerName();

    const decoratorOptions =
      resolverClass && resolverHandler
        ? getSerializationOptions(resolverClass, resolverHandler)
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
