import { buildCacheKey, type CacheStore, type CacheSetOptions } from '@nl-framework/core';
import type { HttpExecutionContext } from '../guards/types';
import type { CallHandler, HttpInterceptor } from './types';

interface CachedResponsePayload {
  kind: 'response';
  status: number;
  headers: [string, string][];
  body: string;
}

interface CachedDataPayload {
  kind: 'data';
  value: unknown;
}

type CachedPayload = CachedResponsePayload | CachedDataPayload;

export interface HttpCacheInterceptorOptions extends CacheSetOptions {
  store: CacheStore;
  /**
   * Allowed HTTP methods to cache. Defaults to GET and HEAD.
   */
  methods?: string[];
  /**
   * Build a cache key from the execution context. Defaults to method + full URL.
   */
  key?: (context: HttpExecutionContext) => string | undefined | Promise<string | undefined>;
  /**
   * Whether a given response/result should be cached.
   */
  shouldCacheResult?: (context: HttpExecutionContext, result: unknown) => boolean | Promise<boolean>;
  /**
   * Limit which HTTP status codes are cached when the handler returns a Response.
   * Defaults to 200 only.
   */
  statusCodes?: number[];
}

export class HttpCacheInterceptor implements HttpInterceptor {
  private readonly cacheableMethods: Set<string>;
  private readonly statusCodes: Set<number>;

  constructor(private readonly options: HttpCacheInterceptorOptions) {
    this.cacheableMethods = new Set(
      (options.methods ?? ['GET', 'HEAD']).map((method) => method.toUpperCase()),
    );
    this.statusCodes = new Set(options.statusCodes ?? [200]);
  }

  async intercept(context: HttpExecutionContext, next: CallHandler): Promise<unknown> {
    const request = context.getRequest<Request>();
    const method = request.method?.toUpperCase?.() ?? 'GET';

    if (!this.cacheableMethods.has(method)) {
      return next.handle();
    }

    const cacheKey = await this.resolveKey(context);
    if (!cacheKey) {
      return next.handle();
    }

    const cached = await this.options.store.get<CachedPayload>(cacheKey);
    if (cached) {
      return this.restore(cached);
    }

    const result = await next.handle();

    if (!(await this.shouldCache(context, result))) {
      return result;
    }

    const payload = await this.serialize(result);
    await this.options.store.set(cacheKey, payload, { ttl: this.options.ttl });
    return result;
  }

  private async resolveKey(context: HttpExecutionContext): Promise<string | undefined> {
    if (this.options.key) {
      return this.options.key(context);
    }

    const request = context.getRequest<Request>();
    return buildCacheKey(request.method ?? 'GET', request.url);
  }

  private async shouldCache(context: HttpExecutionContext, result: unknown): Promise<boolean> {
    if (this.options.shouldCacheResult) {
      return this.options.shouldCacheResult(context, result);
    }

    if (result instanceof Response) {
      return this.statusCodes.has(result.status);
    }

    return true;
  }

  private async serialize(result: unknown): Promise<CachedPayload> {
    if (result instanceof Response) {
      const clone = result.clone();
      const body = await clone.text();
      return {
        kind: 'response',
        status: clone.status,
        headers: [...clone.headers.entries()],
        body,
      };
    }

    return { kind: 'data', value: result };
  }

  private restore(payload: CachedPayload): unknown {
    if (payload.kind === 'response') {
      return new Response(payload.body, {
        status: payload.status,
        headers: payload.headers,
      });
    }

    return payload.value;
  }
}
