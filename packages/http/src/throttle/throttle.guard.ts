import { InMemoryCacheStore, type CacheStore } from '@nl-framework/core';
import type { CanActivate, GuardDecision, GuardFunction, HttpExecutionContext } from '../guards/types';
import { resolveThrottleConfig, isThrottleSkipped, type ThrottleConfig } from './metadata';

export interface ThrottleGuardOptions {
  /** Backing store for request counts. Defaults to an in-memory store. */
  store?: CacheStore;
  /**
   * Derive the client identity from the request context. Defaults to the first
   * hop of `x-forwarded-for`, then `x-real-ip`, then `'global'`.
   */
  keyResolver?: (context: HttpExecutionContext) => string;
  /** Clock injection seam for testing window resets. Defaults to `Date.now`. */
  now?: () => number;
  /** Fallback config applied to routes without an explicit `@Throttle`. Off by default. */
  default?: ThrottleConfig;
}

const defaultKeyResolver = (context: HttpExecutionContext): string => {
  const headers = context.getRequest().headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }
  return headers.get('x-real-ip') ?? 'global';
};

/**
 * Fixed-window rate-limiting guard. Reads `@Throttle` config off the matched
 * route, counts requests per `throttle:{route}:{clientKey}:{window}` key in a
 * `CacheStore`, and returns a 429 with `Retry-After` once the limit is reached.
 */
export class ThrottleGuard implements CanActivate {
  private readonly store: CacheStore;
  private readonly keyResolver: (context: HttpExecutionContext) => string;
  private readonly now: () => number;
  private readonly fallback?: ThrottleConfig;

  constructor(options: ThrottleGuardOptions = {}) {
    this.store = options.store ?? new InMemoryCacheStore();
    this.keyResolver = options.keyResolver ?? defaultKeyResolver;
    this.now = options.now ?? Date.now;
    this.fallback = options.default;
  }

  async canActivate(context: HttpExecutionContext): Promise<GuardDecision> {
    const controller = context.getClass();
    const handlerName = context.getHandlerName();

    if (controller && isThrottleSkipped(controller, handlerName)) {
      return true;
    }

    const config = (controller && resolveThrottleConfig(controller, handlerName)) ?? this.fallback;
    if (!config) {
      return true;
    }

    const clientKey = this.keyResolver(context);
    const routeKey = `${controller?.name ?? 'route'}.${String(handlerName ?? '')}`;
    const now = this.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const cacheKey = `throttle:${routeKey}:${clientKey}:${windowStart}`;

    const current = (await this.store.get<number>(cacheKey)) ?? 0;
    if (current >= config.limit) {
      const retryAfter = Math.max(1, Math.ceil((windowStart + config.windowMs - now) / 1000));
      return new Response(
        JSON.stringify({ statusCode: 429, message: 'Too Many Requests' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        },
      );
    }

    await this.store.set(cacheKey, current + 1, { ttl: config.windowMs });
    return true;
  }
}

/**
 * Build a configured throttle guard as a `GuardFunction`, ready to hand to
 * `registerHttpGuard` (global) or `@UseGuards`. A single guard instance (and its
 * store) is shared across all requests.
 *
 * ```ts
 * registerHttpGuard(createThrottleGuard({ default: { limit: 100, windowMs: 60_000 } }));
 * ```
 */
export const createThrottleGuard = (options: ThrottleGuardOptions = {}): GuardFunction => {
  const guard = new ThrottleGuard(options);
  return (context: HttpExecutionContext) => guard.canActivate(context);
};
