import type { Token } from '@nl-framework/core';
import type {
  BindableHealthIndicator,
  HealthCheckContext,
  HealthResult,
} from '../interfaces';

interface Pinger {
  ping(): Promise<unknown>;
}

export interface RedisIndicatorOptions {
  /** A Redis-like client with a `ping()` method. */
  client?: Pinger;
  /** A DI token resolving to a client (or a cache store exposing one). */
  token?: Token;
  /** Override the indicator name (default `redis`). */
  name?: string;
}

const asPinger = (value: unknown): Pinger | undefined => {
  if (value && typeof (value as Pinger).ping === 'function') {
    return value as Pinger;
  }
  // Unwrap a cache store that keeps its client on a `client` field.
  const client = (value as { client?: unknown } | undefined)?.client;
  if (client && typeof (client as Pinger).ping === 'function') {
    return client as Pinger;
  }
  return undefined;
};

/**
 * `PING`s a Redis client. Degrades cleanly to `down` (reason `not configured`)
 * when no client is provided or resolvable, so it never breaks apps without
 * Redis. Supply `client`, or a `token` resolving to a client or cache store.
 */
export const redisIndicator = (options: RedisIndicatorOptions = {}): BindableHealthIndicator => {
  let client: Pinger | undefined = options.client;
  let context: HealthCheckContext | undefined;

  return {
    name: options.name ?? 'redis',

    async bind(ctx: HealthCheckContext): Promise<void> {
      context = ctx;
      if (!client && options.token) {
        client = asPinger(await ctx.resolve(options.token));
      }
    },

    async check(): Promise<HealthResult> {
      let target = client;
      if (!target && options.token && context) {
        target = asPinger(await context.resolve(options.token));
      }
      if (!target) {
        return { status: 'down', details: { reason: 'not configured' } };
      }
      const startedAt = performance.now();
      try {
        await target.ping();
        return { status: 'up', details: { latencyMs: Math.round(performance.now() - startedAt) } };
      } catch (error) {
        return {
          status: 'down',
          details: { reason: error instanceof Error ? error.message : String(error) },
        };
      }
    },
  };
};
