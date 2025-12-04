import {
  buildCacheKey,
  type CacheKeyPart,
  type CacheStore,
  type CacheSetOptions,
} from '@nl-framework/core';
import type { GraphqlExecutionContext } from '../guards/types';
import type { GraphqlCallHandler, GraphqlInterceptor } from './types';

export interface GraphqlCacheInterceptorOptions extends CacheSetOptions {
  store: CacheStore;
  /**
   * Build a cache key from the execution context. Defaults to resolver + field + args.
   */
  key?: (
    context: GraphqlExecutionContext,
  ) => string | undefined | Promise<string | undefined>;
  /**
   * Should this resolver result be cached?
   */
  shouldCacheResult?: (
    context: GraphqlExecutionContext,
    result: unknown,
  ) => boolean | Promise<boolean>;
  /**
   * Operations to cache. Defaults to queries only.
   */
  operations?: Array<'query' | 'mutation' | 'subscription'>;
}

export class GraphqlCacheInterceptor implements GraphqlInterceptor {
  private readonly cacheableOperations: Set<string>;

  constructor(private readonly options: GraphqlCacheInterceptorOptions) {
    this.cacheableOperations = new Set(
      (options.operations ?? ['query']).map((op) => op.toLowerCase()),
    );
  }

  async intercept(context: GraphqlExecutionContext, next: GraphqlCallHandler): Promise<unknown> {
    const operation = context.getInfo().operation?.operation?.toLowerCase?.() ?? 'query';
    if (!this.cacheableOperations.has(operation)) {
      return next.handle();
    }

    const cacheKey = await this.resolveKey(context);
    if (!cacheKey) {
      return next.handle();
    }

    const cached = await this.options.store.get<unknown>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const result = await next.handle();

    if (!(await this.shouldCache(context, result))) {
      return result;
    }

    await this.options.store.set(cacheKey, result, { ttl: this.options.ttl });
    return result;
  }

  private async resolveKey(context: GraphqlExecutionContext): Promise<string | undefined> {
    if (this.options.key) {
      return this.options.key(context);
    }

    const args = context.getArgs();
    const argsForKey: CacheKeyPart = Array.isArray(args)
      ? (args as CacheKeyPart)
      : args && typeof args === 'object'
        ? (args as Record<string, CacheKeyPart>)
        : (args as CacheKeyPart);

    return buildCacheKey(
      context.getResolverClass()?.name ?? 'resolver',
      context.getResolverHandlerName() ?? 'handler',
      argsForKey,
    );
  }

  private async shouldCache(
    context: GraphqlExecutionContext,
    result: unknown,
  ): Promise<boolean> {
    if (this.options.shouldCacheResult) {
      return this.options.shouldCacheResult(context, result);
    }

    return true;
  }
}
